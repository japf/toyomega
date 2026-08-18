# Toyomega

Simulateur financier interactif pour comparer la conservation d'une Toyota Corolla hybride avec l'achat d'une Renault Mégane E-Tech EV60 d'occasion.

## Utilisation

Ouvrir <https://japf.github.io/toyomega/> ou ouvrir `index.html` directement dans un navigateur.

Toutes les hypothèses sont éditables. Elles sont conservées localement dans le navigateur avec `localStorage`.

## Calculs

Le moteur financier se trouve dans `megane-calculator.js`. Il calcule notamment :

- les coûts annuels d'énergie, d'assurance et d'entretien ;
- le décaissement initial et les coûts additionnels ;
- le délai de rentabilité ;
- le bilan à l'horizon choisi, avec revente et coût du capital ;
- la matrice prix de la Mégane × prix de l'essence.

Les montants sont exprimés en euros constants. Les résultats dépendent entièrement des hypothèses saisies et ne constituent pas un conseil financier.

Les valeurs de revente sont saisies en euros absolus ; le simulateur affiche la décote qu'elles impliquent, et la matrice de sensibilité indexe la revente de la Mégane sur son prix d'achat au même taux. Voir [`ANALYSIS.md`](ANALYSIS.md) pour une revue sourcée des hypothèses par défaut et de leur poids relatif sur le résultat.

## Tests

```bash
npm test
```

Le projet n'a aucune dépendance externe et utilise le module natif `node:test`.
