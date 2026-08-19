const test = require("node:test");
const assert = require("node:assert/strict");
const calculator = require("./megane-calculator.js");

function closeTo(actual, expected, tolerance = 0.01) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} devrait être proche de ${expected}`,
  );
}

test("retrouve le scénario central actuel", () => {
  const result = calculator.calculate();

  closeTo(result.annualCosts.electricity.totalCost, 634.55);
  closeTo(result.annualCosts.toyota, 3180.14);
  closeTo(result.annualCosts.megane, 1789.55);
  closeTo(result.annualSavings, 1390.59);
  assert.equal(result.switchingCosts, 2480);
  assert.equal(result.initialOutlay, 7480);
  closeTo(result.paybackYears, 5.379);
  closeTo(result.cashBalance, -527.03);
  closeTo(result.fullResult, -4027.03);
  assert.equal(result.state, "defavorable");
});

test("le scénario ne bascule que sur des hypothèses de revente hautes", () => {
  // La bande documentée dans ANALYSIS.md : 7 500 à 11 000 € pour la Mégane.
  // Aucune valeur de cette bande ne rend l'opération favorable à 5 ans.
  for (const meganeResaleValue of [7500, 9000, 11000]) {
    const result = calculator.calculate({ meganeResaleValue });
    assert.ok(result.fullResult < 0, `${meganeResaleValue} € devrait rester défavorable`);
  }

  // Il faut remonter au-dessus de ~13 000 € (l'ancien défaut) pour repasser positif.
  assert.ok(calculator.calculate({ meganeResaleValue: 13000 }).fullResult < 0);
  assert.ok(calculator.calculate({ meganeResaleValue: 14000 }).fullResult > 0);
});

test("l'horizon long reste le seul cas favorable aux hypothèses courantes", () => {
  assert.ok(calculator.calculate({ horizon: 5 }).fullResult < 0);
  assert.ok(calculator.calculate({ horizon: 7 }).fullResult < 0);
  assert.ok(calculator.calculate({ horizon: 10 }).fullResult > 0);
});

test("détaille la recharge domestique, solaire et publique", () => {
  const electricity = calculator.electricityBreakdown();

  assert.equal(electricity.totalKwh, 4000);
  assert.equal(electricity.homeKwh, 3700);
  assert.equal(electricity.publicKwh, 300);
  assert.equal(electricity.freeSolarKwh, 620);
  assert.equal(electricity.paidHomeKwh, 3080);
  closeTo(electricity.publicCost, 165);
});

test("applique le coût du capital aux flux", () => {
  const withoutCapital = calculator.calculate({ horizon: 7 });
  const withCapital = calculator.calculate({ horizon: 7, capitalRate: 0.05 });

  assert.ok(withCapital.cashBalance < withoutCapital.cashBalance);
  assert.ok(withCapital.paybackYears > withoutCapital.paybackYears);
  closeTo(calculator.accumulationFactor(5, 0), 5);
  closeTo(calculator.futureValue(1000, 2, 0.05), 1102.5);
});

test("classe un bilan positif obtenu uniquement grâce à la revente comme incertain", () => {
  const result = calculator.calculate({
    fuelPrice: 1.5,
    horizon: 5,
    meganeResaleValue: 18000,
    toyotaResaleValue: 8000,
  });

  assert.ok(result.cashBalance < 0);
  assert.ok(result.fullResult > 0);
  assert.equal(result.state, "incertain");
});

test("la matrice se dégrade avec le prix de la Mégane et progresse avec l'essence", () => {
  const base = calculator.calculate({ meganePrice: 25000, fuelPrice: 2 });
  const pricier = calculator.calculate({ meganePrice: 26000, fuelPrice: 2 });
  const higherFuel = calculator.calculate({ meganePrice: 25000, fuelPrice: 2.1 });

  assert.ok(pricier.paybackYears > base.paybackYears);
  assert.ok(pricier.fullResult < base.fullResult);
  assert.ok(higherFuel.paybackYears < base.paybackYears);
  assert.ok(higherFuel.fullResult > base.fullResult);
});

test("déduit le taux de revente des hypothèses saisies", () => {
  const ratios = calculator.impliedResaleRatio();

  closeTo(ratios.megane, 9000 / 26000);
  closeTo(ratios.toyota, 12500 / 21000);
  assert.equal(calculator.impliedResaleRatio({ meganePrice: 0 }).megane, 0);
});

test("indexe la revente sur le prix d'achat quand le prix varie", () => {
  const linked = calculator.withMeganePrice({}, 30000);

  assert.equal(linked.meganePrice, 30000);
  closeTo(linked.meganeResaleValue, 30000 * (9000 / 26000));
  // Au prix courant, le couplage est neutre : c'est le point d'ancrage.
  closeTo(calculator.withMeganePrice({}, 26000).meganeResaleValue, 9000);
});

test("le couplage prix/revente fait pivoter la matrice au lieu de la translater", () => {
  const cheapFixed = calculator.calculate({ meganePrice: 20000 }).fullResult;
  const cheapLinked = calculator.calculate(calculator.withMeganePrice({}, 20000)).fullResult;
  const pricyFixed = calculator.calculate({ meganePrice: 30000 }).fullResult;
  const pricyLinked = calculator.calculate(calculator.withMeganePrice({}, 30000)).fullResult;

  // Une Mégane moins chère se revend moins cher : le gain est surestimé sans couplage.
  assert.ok(cheapLinked < cheapFixed);
  // Une Mégane plus chère se revend plus cher : la perte est surestimée sans couplage.
  assert.ok(pricyLinked > pricyFixed);
  // Le résultat reste monotone décroissant avec le prix d'achat.
  assert.ok(pricyLinked < cheapLinked);
});

test("le prix plafond tient compte de la revente indexée", () => {
  const { maxMeganePrice, maxMeganePriceFixedResale, resaleRatio } = calculator.thresholds();

  closeTo(resaleRatio, 9000 / 26000);
  closeTo(maxMeganePriceFixedResale, 21972.97, 1);
  closeTo(maxMeganePrice, 19841.01, 1);
  // Taux de revente faible => le plafond indexé est SOUS le plafond à revente figée.
  assert.ok(maxMeganePrice < maxMeganePriceFixedResale);
  // À ce prix, le bilan complet doit s'annuler.
  closeTo(calculator.calculate(calculator.withMeganePrice({}, maxMeganePrice)).fullResult, 0, 0.01);
});

test("un taux de revente supérieur au coût du capital rend le plafond infini", () => {
  const { maxMeganePrice } = calculator.thresholds({ meganeResaleValue: 26000 });

  assert.equal(maxMeganePrice, Infinity);
});

test("rejette les hypothèses incohérentes", () => {
  assert.throws(() => calculator.calculate({ annualKm: -1 }), /annualKm/);
  assert.throws(
    () => calculator.calculate({ annualKm: 1000, publicChargingKm: 2000 }),
    /publicChargingKm/,
  );
  assert.throws(() => calculator.calculate({ horizon: 13 }), /horizon/);
});