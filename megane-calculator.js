(function exposeCalculator(root, factory) {
  const calculator = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = calculator;
  if (root) root.MeganeCalculator = calculator;
})(typeof globalThis !== "undefined" ? globalThis : this, function createCalculator() {
  "use strict";

  const DEFAULTS = Object.freeze({
    meganePrice: 26000,
    toyotaSalePrice: 21000,
    annualKm: 20000,
    fuelPrice: 2.019,
    // Relevé sur l'ordinateur de bord du véhicule, pas une valeur catalogue.
    // Élevé pour une Corolla hybride (4,1 L/100 en mixte sur le test de
    // consommation réelle Motor1), cohérent avec un usage en relief : sur une
    // montée soutenue la batterie hybride (~1 kWh utile) se vide et le moteur
    // Atkinson travaille seul, et en descente la régénération sature presque
    // immédiatement. Voir ANALYSIS.md § 2 pour ce que ce profil implique — et
    // n'implique pas — côté Mégane.
    toyotaConsumption: 5.3,
    meganeConsumption: 20,
    toyotaInsurance: 540,
    meganeInsurance: 655,
    toyotaMaintenance: 500,
    meganeMaintenance: 500,
    publicChargingKm: 1500,
    publicElectricityPrice: 0.55,
    homeElectricityPrice: 0.15245,
    freeSolarKwh: 620,
    chargingInstallation: 300,
    meganeWinterTires: 700,
    toyotaWinterTiresResale: 120,
    towHitch: 1000,
    dealerFees: 300,
    registration: 300,
    horizon: 5,
    // Valeurs à l'horizon, en euros constants. Ce sont les deux hypothèses les
    // plus incertaines et les plus lourdes du modèle : ±1 500 € sur la Mégane
    // déplace le résultat de ±1 500 €, soit plus qu'une année d'économies.
    // Toyota : 12 500 € = −40,5 % sur 5 ans. Une hybride Toyota tient sa valeur ;
    // c'est le poste le mieux documenté des deux.
    toyotaResaleValue: 12500,
    // Mégane : 9 000 € = 34,6 % du prix d'achat. Ancré sur le prix constaté des
    // électriques de 8-9 ans à batterie NMC ~60 kWh, pas sur un taux de décote
    // appliqué au prix 2026. À l'horizon, la Mégane pré-restylage sera une
    // génération dépassée (restylage juillet 2026 : LFP 67 kWh, 501 km, 165 kW)
    // et sortie de la garantie batterie 8 ans / 160 000 km.
    // Bande défendable : 7 500 à 11 000 €. Raccourcis disponibles dans l'UI.
    meganeResaleValue: 9000,
    capitalRate: 0,
  });

  function assumptionsWithDefaults(values = {}) {
    return { ...DEFAULTS, ...values };
  }

  function validate(values) {
    for (const [name, value] of Object.entries(values)) {
      if (!Number.isFinite(value)) throw new TypeError(`${name} doit être un nombre fini`);
      if (value < 0) throw new RangeError(`${name} ne peut pas être négatif`);
    }
    if (values.publicChargingKm > values.annualKm) {
      throw new RangeError("publicChargingKm ne peut pas dépasser annualKm");
    }
    if (values.horizon < 1 || values.horizon > 12) {
      throw new RangeError("horizon doit être compris entre 1 et 12 ans");
    }
    return values;
  }

  // Le prix d'achat et le prix de revente d'un même modèle ne sont pas
  // indépendants : payer 2 000 € de plus aujourd'hui, c'est aussi revendre plus
  // cher à l'horizon. On déduit le taux de revente des hypothèses saisies par
  // l'utilisateur, sans lui en imposer un nouveau.
  function impliedResaleRatio(input = {}) {
    const values = validate(assumptionsWithDefaults(input));
    return {
      megane: values.meganePrice > 0 ? values.meganeResaleValue / values.meganePrice : 0,
      toyota: values.toyotaSalePrice > 0 ? values.toyotaResaleValue / values.toyotaSalePrice : 0,
    };
  }

  // Fait varier le prix de la Mégane en gardant le taux de revente constant.
  // À utiliser partout où `meganePrice` bouge sans que l'utilisateur ait
  // réactualisé `meganeResaleValue` (matrice de sensibilité, calcul de seuil).
  function withMeganePrice(input = {}, price) {
    const values = validate(assumptionsWithDefaults(input));
    const ratio = impliedResaleRatio(values).megane;
    return { ...values, meganePrice: price, meganeResaleValue: price * ratio };
  }

  function switchingCosts(input = {}) {
    const values = validate(assumptionsWithDefaults(input));
    return values.chargingInstallation
      + values.meganeWinterTires
      - values.toyotaWinterTiresResale
      + values.towHitch
      + values.dealerFees
      + values.registration;
  }

  function initialOutlay(input = {}) {
    const values = validate(assumptionsWithDefaults(input));
    return values.meganePrice + switchingCosts(values) - values.toyotaSalePrice;
  }

  function electricityBreakdown(input = {}) {
    const values = validate(assumptionsWithDefaults(input));
    const homeKm = values.annualKm - values.publicChargingKm;
    const homeKwh = homeKm * values.meganeConsumption / 100;
    const publicKwh = values.publicChargingKm * values.meganeConsumption / 100;
    const paidHomeKwh = Math.max(0, homeKwh - values.freeSolarKwh);
    const homeCost = paidHomeKwh * values.homeElectricityPrice;
    const publicCost = publicKwh * values.publicElectricityPrice;
    return {
      totalKwh: homeKwh + publicKwh,
      homeKwh,
      publicKwh,
      freeSolarKwh: Math.min(homeKwh, values.freeSolarKwh),
      paidHomeKwh,
      homeCost,
      publicCost,
      totalCost: homeCost + publicCost,
    };
  }

  function annualCosts(input = {}) {
    const values = validate(assumptionsWithDefaults(input));
    const electricity = electricityBreakdown(values);
    const annualLitres = values.annualKm * values.toyotaConsumption / 100;
    const fuelCost = annualLitres * values.fuelPrice;
    const toyota = fuelCost + values.toyotaInsurance + values.toyotaMaintenance;
    const megane = electricity.totalCost + values.meganeInsurance + values.meganeMaintenance;
    return {
      annualLitres,
      fuelCost,
      electricity,
      toyota,
      megane,
      savings: toyota - megane,
    };
  }

  function accumulationFactor(years, rate) {
    if (rate === 0) return years;
    return (Math.pow(1 + rate, years) - 1) / rate;
  }

  function futureValue(value, years, rate) {
    return value * Math.pow(1 + rate, years);
  }

  function cashBalanceAtHorizon(input = {}) {
    const values = validate(assumptionsWithDefaults(input));
    const savings = annualCosts(values).savings;
    return savings * accumulationFactor(values.horizon, values.capitalRate)
      - futureValue(initialOutlay(values), values.horizon, values.capitalRate);
  }

  function paybackYears(input = {}) {
    const values = validate(assumptionsWithDefaults(input));
    const outlay = initialOutlay(values);
    const savings = annualCosts(values).savings;
    const rate = values.capitalRate;
    if (outlay <= 0) return 0;
    if (savings <= 0) return Infinity;
    if (rate === 0) return outlay / savings;
    if (savings <= outlay * rate) return Infinity;
    return Math.log((savings / rate) / (savings / rate - outlay)) / Math.log(1 + rate);
  }

  function resultAtHorizon(input = {}) {
    const values = validate(assumptionsWithDefaults(input));
    return cashBalanceAtHorizon(values) + values.meganeResaleValue - values.toyotaResaleValue;
  }

  function resultState(result, payback, horizon) {
    if (result >= 0 && payback <= horizon) return "favorable";
    if (result >= 0) return "incertain";
    return "defavorable";
  }

  function thresholds(input = {}) {
    const values = validate(assumptionsWithDefaults(input));
    const costs = annualCosts(values);
    const factor = accumulationFactor(values.horizon, values.capitalRate);
    const capitalFactor = Math.pow(1 + values.capitalRate, values.horizon);
    const resaleGap = values.meganeResaleValue - values.toyotaResaleValue;

    // Prix maximal en gardant la revente FIGÉE au montant saisi. Conservé pour
    // référence : ce seuil suppose qu'on peut payer la Mégane plus cher et la
    // revendre malgré tout au même prix, ce qui n'a pas de sens économique.
    const maxMeganePriceFixedResale = values.toyotaSalePrice - switchingCosts(values)
      + (costs.savings * factor + resaleGap) / capitalFactor;

    // Prix maximal en laissant la revente suivre le prix d'achat au taux
    // implicite r. On résout en P :
    //   savings*factor + P*r - toyotaResale - (P + SC - TSP)*capitalFactor = 0
    const ratio = impliedResaleRatio(values).megane;
    const denominator = capitalFactor - ratio;
    const maxMeganePrice = denominator > 0
      ? (costs.savings * factor - values.toyotaResaleValue
         + (values.toyotaSalePrice - switchingCosts(values)) * capitalFactor) / denominator
      : Infinity;

    const savingsWithoutFuel = costs.savings - costs.annualLitres * values.fuelPrice;
    const breakEvenFuelPrice = (
      futureValue(initialOutlay(values), values.horizon, values.capitalRate)
      - resaleGap
      - savingsWithoutFuel * factor
    ) / (costs.annualLitres * factor);
    return { maxMeganePrice, maxMeganePriceFixedResale, breakEvenFuelPrice, resaleRatio: ratio };
  }

  function projection(input = {}) {
    const values = validate(assumptionsWithDefaults(input));
    const costs = annualCosts(values);
    const outlay = initialOutlay(values);
    return Array.from({ length: values.horizon + 1 }, (_, year) => {
      const recurringFactor = accumulationFactor(year, values.capitalRate);
      return {
        year,
        toyotaCost: costs.toyota * recurringFactor,
        meganeCost: futureValue(outlay, year, values.capitalRate)
          + costs.megane * recurringFactor,
      };
    });
  }

  function calculate(input = {}) {
    const assumptions = validate(assumptionsWithDefaults(input));
    const costs = annualCosts(assumptions);
    const payback = paybackYears(assumptions);
    const cashBalance = cashBalanceAtHorizon(assumptions);
    const fullResult = cashBalance + assumptions.meganeResaleValue - assumptions.toyotaResaleValue;
    return {
      assumptions,
      switchingCosts: switchingCosts(assumptions),
      initialOutlay: initialOutlay(assumptions),
      annualCosts: costs,
      annualSavings: costs.savings,
      paybackYears: payback,
      cashBalance,
      fullResult,
      state: resultState(fullResult, payback, assumptions.horizon),
      thresholds: thresholds(assumptions),
      projection: projection(assumptions),
    };
  }

  return Object.freeze({
    DEFAULTS,
    assumptionsWithDefaults,
    impliedResaleRatio,
    withMeganePrice,
    switchingCosts,
    initialOutlay,
    electricityBreakdown,
    annualCosts,
    accumulationFactor,
    futureValue,
    cashBalanceAtHorizon,
    paybackYears,
    resultAtHorizon,
    resultState,
    thresholds,
    projection,
    calculate,
  });
});