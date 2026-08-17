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
    toyotaConsumption: 5.6,
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
    toyotaResaleValue: 12000,
    meganeResaleValue: 13000,
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
    const maxMeganePrice = values.toyotaSalePrice - switchingCosts(values)
      + (costs.savings * factor + resaleGap) / capitalFactor;
    const savingsWithoutFuel = costs.savings - costs.annualLitres * values.fuelPrice;
    const breakEvenFuelPrice = (
      futureValue(initialOutlay(values), values.horizon, values.capitalRate)
      - resaleGap
      - savingsWithoutFuel * factor
    ) / (costs.annualLitres * factor);
    return { maxMeganePrice, breakEvenFuelPrice };
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