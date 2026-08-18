# Revue des hypothèses

Document d'accompagnement. Il n'impose aucune valeur : **cette PR ne modifie aucune
valeur par défaut du simulateur.** L'objet est de rendre visibles les hypothèses qui
portent le résultat, pour qu'elles soient arbitrées en connaissance de cause.

Toutes les valeurs citées ci-dessous sortent de `megane-calculator.js` aux défauts du
dépôt (horizon 5 ans, `capitalRate: 0`), sauf mention contraire.

---

## 1. Le verdict repose presque entièrement sur l'écart de revente

Au scénario par défaut :

| Indicateur | Valeur |
|---|---|
| Décaissement initial | 7 480 € |
| Coût annuel Toyota | 3 301 € |
| Coût annuel Mégane | 1 790 € |
| Économie annuelle | 1 512 € |
| Rentabilité hors revente | 4,95 ans |
| **Trésorerie avant revente à 5 ans** | **+79 €** |
| **Résultat complet à 5 ans** | **+1 079 €** → `favorable` |

Hors revente, le bilan à 5 ans est de **+79 € sur un décaissement de 7 480 €**, soit
zéro à la précision des hypothèses. Le classement `favorable` vient donc à ~93 % de
l'écart de revente supposé (+1 000 €).

Ce n'est pas un défaut du modèle — il expose correctement les deux chiffres côte à côte.
C'est un point d'attention sur la lecture : le KPI « rentabilité hors revente » (4,95 ans)
tombe juste sous l'horizon de 5 ans, ce qui déclenche l'état `favorable` par le second
terme de `resultState()`. Un dixième de point d'écart sur n'importe quelle hypothèse
énergétique fait basculer ce test.

**Le simulateur n'oublie pas la revente.** Elle est bien dans
`resultAtHorizon() = cashBalance + meganeResaleValue − toyotaResaleValue`, et
`renderResaleWarning()` signale même les valeurs périmées quand l'horizon change. La
question porte sur le *niveau* retenu, pas sur la présence du poste.

## 2. Le taux de décote implicite est asymétrique à l'envers

Les deux valeurs de revente sont saisies en euros absolus, ce qui masque les taux qu'elles
impliquent :

| | Aujourd'hui | À 5 ans | Décote implicite |
|---|---|---|---|
| Toyota Corolla hybride | 21 000 € | 12 000 € | **−42,9 %** |
| Renault Mégane E-Tech | 26 000 € | 13 000 € | **−50,0 %** |

Un écart de 7 points seulement entre une hybride Toyota et une électrique compacte. Les
données publiques disponibles vont dans l'autre sens, et l'écart est plus large :

- Une électrique récente perd **45 à 55 % en 4 ans**, pas en 5
  ([Autohero](https://www.autohero.com/fr/conseil/explorer/types-de-moteurs/electrique/decote/)).
- Les **générations électriques dépassées** décotent de **65 à 70 %** (même source). La
  Mégane E-Tech pré-restylage est passée dans cette catégorie en **juillet 2026**, avec
  l'arrivée de la restylée à 37 500 € : batterie LFP 67 kWh, 501 km WLTP, 165 kW en DC
  ([L'argus](https://www.largus.fr/actualite-automobile/prix-megane-e-tech-restylee-2026-les-tarifs-et-la-gamme-de-la-compacte-electrique-revue-et-corrigee-2214407.html)).
- La garantie batterie (8 ans / 160 000 km) est un plancher de valeur qui disparaît à
  l'horizon : à 20 000 km/an, le seuil kilométrique tombe avant le seuil calendaire.

À titre indicatif seulement — ce sont des hypothèses, pas des données :

| Revente à 5 ans | Résultat complet |
|---|---|
| Défaut du dépôt (Toy 12 000 / Meg 13 000) | **+1 079 €** |
| Toy 12 000 / Meg 10 000 | −1 921 € |
| Toy 12 500 / Meg 9 000 | −3 421 € |
| Toy 13 000 / Meg 7 500 | −5 421 € |

Ce que cette PR ajoute : l'affichage de la décote implicite sous les deux champs, pour
que l'asymétrie soit lisible. Le choix des valeurs reste au mainteneur.

**Cas particulier de l'horizon.** Passer l'horizon à 10 ans sans réactualiser les reventes
donne **+8 637 €**, le meilleur résultat de tout le simulateur — avec des valeurs de
revente calibrées pour 5 ans. Le nouvel affichage rend le problème explicite : il indique
alors « décote implicite sur 10 ans : Toyota −42,9 %, Mégane −50,0 % », ce qui se voit
immédiatement. L'avertissement existant reste utile, mais il demande de corriger un
chiffre sans donner d'ordre de grandeur.

## 3. Bug corrigé : prix d'achat et revente étaient décorrélés

`renderMatrix()` faisait varier `meganePrice` sur l'axe vertical **en gardant
`meganeResaleValue` figée à 13 000 €**. La colonne « Mégane à 22 000 € » et la colonne
« Mégane à 30 000 € » se revendaient donc au même prix, ce qui n'a pas de sens
économique : prix d'achat et prix de revente d'un même modèle sont fortement corrélés.
Même problème dans `thresholds().maxMeganePrice`, qui annonçait un prix plafond en
supposant une revente inchangée.

La correction n'introduit aucune hypothèse nouvelle : elle déduit le taux de revente des
valeurs déjà saisies (`impliedResaleRatio()`) et le maintient constant quand le prix
varie (`withMeganePrice()`). Au prix courant, le couplage est neutre par construction —
c'est le point d'ancrage.

**Il faut être clair sur le sens de cette correction : elle ne va pas dans le sens de
mon argumentaire ci-dessus.** À 50 % de taux implicite, la moitié de chaque euro
supplémentaire revient à la revente, donc :

| Prix Mégane | Avant (revente figée) | Après (revente indexée) |
|---|---|---|
| 20 000 € | +7 079 € | +4 079 € |
| 22 000 € | +5 079 € | +3 079 € |
| **26 000 € (scénario courant)** | **+1 079 €** | **+1 079 €** |
| 28 000 € | −921 € | +79 € |
| 30 000 € | −2 921 € | −921 € |

La matrice **pivote** autour du scénario courant, elle ne se translate pas. Le prix
plafond passe de 27 079 € à **28 158 €** : le bug rendait le modèle *plus* pessimiste sur
les Mégane chères et *plus* optimiste sur les Mégane bon marché. Corriger le bug ne
change pas le verdict au scénario par défaut, et desserre même légèrement la contrainte
de prix.

Autrement dit : la cohérence interne et le niveau du taux de décote sont deux questions
distinctes. Cette PR règle la première et se contente de documenter la seconde.

## 4. Autres hypothèses à arbitrer (aucune modifiée ici)

Effet sur le résultat complet à 5 ans d'un remplacement de chaque défaut, pris isolément :

| Hypothèse | Défaut | Variante | Effet |
|---|---|---|---|
| Revente Mégane | 13 000 € | 9 000 € | −4 000 € |
| Conso Toyota | 5,6 L/100 | 4,8 L/100 | −1 615 € |
| Entretien Mégane | 500 €/an | 800 €/an | −1 500 € |
| Prix essence | 2,019 €/L | 1,85 €/L | −946 € |
| Installation recharge | 300 € | 1 200 € | −900 € |
| Coût du capital | 0 % | 3 % | −724 € |
| Solaire gratuit | 620 kWh | 0 kWh | −473 € |
| Conso Mégane | 20 kWh/100 | 18,5 kWh/100 | **+273 €** |

**`toyotaConsumption: 5.6`** — le test de consommation réelle de Motor1 sur une Corolla
1.8 Hybrid donne 3,9 L/100 en moyenne sur 967 km, 4,1 en mixte et **5,8 sur autoroute**
([Motor1](https://fr.motor1.com/reviews/344180/toyota-corolla-hybride-le-test-de-consommation-reelle/)).
5,6 en moyenne annuelle correspond donc à un usage quasi exclusivement autoroutier. À
4,8 L, le payback passe de 4,95 à **6,3 ans** et l'état bascule. Si ce 5,6 est un relevé
d'ordinateur de bord sur l'usage réel du véhicule, il est légitime et il faut l'écrire ;
si c'est une estimation, c'est l'hypothèse la plus favorable à la Mégane du modèle.

**`fuelPrice: 2.019`** — correspond au pic d'août 2026 (SP95-E10 à 1,98 €/L au 9 août,
gazole +17 % en 30 jours sur tensions géopolitiques,
[Supercarbu](https://supercarbu.fr/guide/prix-carburant-aout-2026/)). Le simulateur
calcule lui-même son seuil de bascule : **1,826 €/L**. C'est à son crédit, mais le défaut
masque à quel point la marge est mince : un retour à la moyenne longue française annule
le résultat, avant même de toucher aux reventes.

**`meganeMaintenance = toyotaMaintenance = 500 €`** — la parité est un choix défendable
sur l'entretien courant (révision 150-200 € contre 300-400 €, plaquettes qui durent
80-100 000 km), à peu près compensé par des pneus 10-15 % plus chers et ~250 kg de plus.
Ce que la ligne ne couvre pas, c'est le **risque de panne hors garantie** : à 5 ans, une
Mégane de 2022-2023 est sortie de la garantie véhicule. Sur 85 témoignages recensés,
20 concernent le système de charge et 7 le moteur électrique, avec des chargeurs
embarqués à 1 500-2 000 € et des pompes à chaleur à 800-1 200 €
([fiches-auto](https://www.fiches-auto.fr/fiabilite-renault/fiabilite-701-pannes-renault-megane-e-tech.php),
[Autocadre](https://www.autocadre.com/guide-occasion/3291-fiabilite-renault-megane-e-tech-electric-occasion.html)).
Le modèle provisionne les pneus hiver mais pas ça. Une ligne dédiée, distincte de
l'entretien courant, serait plus lisible qu'un gonflement de `meganeMaintenance`.

**`capitalRate: 0`** — le champ existe, mais à zéro les 7 480 € immobilisés sont gratuits.

**`chargingInstallation: 300`** — correspond à une prise renforcée (~2,3 kW, ~14 h pour
un plein), pas à une wallbox 7 kW posée (800-1 500 €). Cohérent si c'est le choix retenu,
mais autant le nommer.

**`freeSolarKwh: 620` à 0 €/kWh** — ces kWh ont un coût d'opportunité (autoconsommation
évitée ailleurs, ou revente en obligation d'achat). Faible en valeur absolue, mais
directionnel.

**À l'inverse, deux hypothèses sont prudentes contre la Mégane**, et il faut le dire :
`meganeConsumption: 20 kWh/100` est au-dessus du réel mesuré (15,6 en été, 17,9 en hiver
+ ~10 % de pertes de charge ≈ 18,5,
[Automobile Propre](https://www.automobile-propre.com/articles/essai-renault-megane-e-tech-ev60-quelle-difference-de-consommation-entre-ete-et-hiver/)),
et le modèle charge honnêtement la Mégane de 700 € de pneus hiver et 1 000 € d'attelage.
L'écart d'assurance retenu (+115 €/an) est cohérent avec le baromètre Assurland de
février 2026, qui relève **+45 % de prime sur les électriques en deux ans, désormais
au-dessus des essence et diesel**
([via Boursorama](https://www.boursorama.com/budget/assurances/actualites/voitures-electriques-l-assurance-explose-et-coute-desormais-plus-cher-que-pour-les-thermiques-91e09487f7d7351cf3c0967f50632fa5)).

Le déséquilibre est donc dans les ordres de grandeur, pas dans l'intention : les postes
prudents pèsent 200-500 €, les postes optimistes 700-4 000 €.

## 5. Pistes non implémentées

Volontairement laissées de côté pour garder cette PR revue-able, et parce qu'elles
touchent aux hypothèses :

1. **Saisir les reventes en taux plutôt qu'en montants**, avec un taux par défaut
   dépendant de l'horizon. Rendrait `renderResaleWarning()` inutile.
2. **Faire dépendre les reventes du kilométrage cumulé.** Aujourd'hui, à 40 000 km/an sur
   10 ans, la Mégane est supposée valoir 13 000 € avec 400 000 km au compteur.
3. **Ligne « provision panne hors garantie »**, distincte de l'entretien courant, avec un
   défaut asymétrique entre les deux véhicules.
4. **Consommation autoroute distincte** pour la Mégane : le modèle applique 20 kWh/100 aux
   km domicile comme aux km sur borne publique, alors que les seconds sont majoritairement
   autoroutiers (22-24 kWh/100) et facturés 0,50-0,65 €/kWh.
5. **Option neuf.** À 26 000 € pour une pré-restylage hors garantie, l'alternative
   pertinente n'est pas seulement la Corolla mais la restylée neuve à 37 500 €, soit
   30 000-34 000 € après prime CEE (3 314 à 7 365 € selon décile de revenu,
   [Hellio](https://particulier.hellio.com/blog/financement/coup-de-pouce-voiture-electrique)),
   avec 8 ans de garantie batterie qui repart à zéro. Une troisième colonne, pas un
   réglage.

## 6. Ce que le modèle fait bien

Pour situer la critique : la mécanique financière est correcte et je n'y ai pas trouvé
d'erreur.

- `accumulationFactor()` / `futureValue()` sont cohérents, et surtout la trésorerie et
  les reventes sont bien datées au même instant `t = horizon` dans `resultAtHorizon()` —
  pas de mélange nominal / actualisé, qui est l'erreur classique de ce type de calcul.
- `paybackYears()` gère correctement le cas `savings ≤ outlay × rate` → jamais rentable.
- Séparer « trésorerie avant revente » et « résultat complet » est exactement le bon
  découpage : c'est ce qui rend le point 1 visible sans avoir à lire le code.
- Deux seuils calculés (prix plafond, prix d'essence pivot) plutôt qu'un seul verdict.
- Des tests unitaires sur un projet de simulation personnel.

---

### Sources

- [fiches-auto — pannes Mégane E-Tech, 85 témoignages](https://www.fiches-auto.fr/fiabilite-renault/fiabilite-701-pannes-renault-megane-e-tech.php)
- [Autocadre — fiabilité et coûts Mégane E-Tech occasion](https://www.autocadre.com/guide-occasion/3291-fiabilite-renault-megane-e-tech-electric-occasion.html)
- [What Car? — Megane E-Tech used reliability](https://www.whatcar.com/renault/megane-e-tech/hatchback/used-review/n28391/reliability)
- [Motor1 — Corolla Hybride, consommation réelle](https://fr.motor1.com/reviews/344180/toyota-corolla-hybride-le-test-de-consommation-reelle/)
- [Automobile Propre — Mégane EV60, consommation été/hiver](https://www.automobile-propre.com/articles/essai-renault-megane-e-tech-ev60-quelle-difference-de-consommation-entre-ete-et-hiver/)
- [Supercarbu — prix carburants août 2026](https://supercarbu.fr/guide/prix-carburant-aout-2026/)
- [Les Furets — prix de l'électricité août 2026](https://www.lesfurets.com/energie/electricite/tarif-electricite)
- [Autohero — décote des électriques 2026](https://www.autohero.com/fr/conseil/explorer/types-de-moteurs/electrique/decote/)
- [L'argus — prix Mégane E-Tech restylée 2026](https://www.largus.fr/actualite-automobile/prix-megane-e-tech-restylee-2026-les-tarifs-et-la-gamme-de-la-compacte-electrique-revue-et-corrigee-2214407.html)
- [Hellio — coup de pouce / prime CEE 2026](https://particulier.hellio.com/blog/financement/coup-de-pouce-voiture-electrique)
- [Boursorama — baromètre Assurland février 2026, assurance des électriques](https://www.boursorama.com/budget/assurances/actualites/voitures-electriques-l-assurance-explose-et-coute-desormais-plus-cher-que-pour-les-thermiques-91e09487f7d7351cf3c0967f50632fa5)
