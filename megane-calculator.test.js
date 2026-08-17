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
  closeTo(result.annualCosts.toyota, 3301.28);
  closeTo(result.annualCosts.megane, 1789.55);
  closeTo(result.annualSavings, 1511.73);
  assert.equal(result.switchingCosts, 2480);
  assert.equal(result.initialOutlay, 7480);
  closeTo(result.paybackYears, 4.95);
  closeTo(result.cashBalance, 78.67);
  closeTo(result.fullResult, 1078.67);
  assert.equal(result.state, "favorable");
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

test("rejette les hypothèses incohérentes", () => {
  assert.throws(() => calculator.calculate({ annualKm: -1 }), /annualKm/);
  assert.throws(
    () => calculator.calculate({ annualKm: 1000, publicChargingKm: 2000 }),
    /publicChargingKm/,
  );
  assert.throws(() => calculator.calculate({ horizon: 13 }), /horizon/);
});