# Revue des hypothèses

Document d'accompagnement du simulateur. Il justifie les valeurs par défaut, chiffre leur
poids relatif et cite ses sources. Toutes les valeurs citées sortent de
`megane-calculator.js` aux défauts du dépôt (horizon 5 ans, `capitalRate: 0`), sauf mention
contraire.

---

## 1. Scénario par défaut

| Indicateur | Valeur |
|---|---|
| Décaissement initial | 7 480 € |
| Coût annuel Toyota | 3 180 € |
| Coût annuel Mégane | 1 790 € |
| Économie annuelle | 1 391 € |
| Rentabilité hors revente | 5,38 ans |
| Trésorerie avant revente à 5 ans | −527 € |
| **Résultat complet à 5 ans** | **−4 027 €** → `defavorable` |

Par horizon :

| Horizon | Trésorerie avant revente | Résultat complet | État |
|---|---|---|---|
| 5 ans | −527 € | **−4 027 €** | `defavorable` |
| 7 ans | +2 254 € | −1 246 € | `defavorable` |
| 10 ans | +6 426 € | **+2 926 €** | `favorable` |

Les deux seuils de bascule calculés par le modèle, à horizon 5 ans :

- **Prix maximal de la Mégane : 19 841 €** (revente indexée sur le prix d'achat).
- **Prix d'essence pivot : 2,78 €/L**, soit 38 % au-dessus du niveau retenu.

Autrement dit, aux hypothèses actuelles l'opération ne s'équilibre à 5 ans qu'en payant la
Mégane ~6 000 € moins cher, ou en supposant un choc durable sur le carburant. Elle
redevient positive à 10 ans, mais ce cas suppose de garder un véhicule électrique de
génération dépassée jusqu'à ses 13-14 ans — voir § 3.

## 2. Les deux hypothèses qui portent le résultat

### Revente à l'horizon

Ce sont les postes les plus lourds et les plus incertains du modèle. ±1 500 € sur la
Mégane déplace le résultat de ±1 500 €, soit plus qu'une année d'économies.

| | Aujourd'hui | À 5 ans | Décote implicite |
|---|---|---|---|
| Toyota Corolla hybride | 21 000 € | **12 500 €** | −40,5 % |
| Renault Mégane E-Tech | 26 000 € | **9 000 €** | −65,4 % |

**Toyota — 12 500 €.** Le poste le mieux documenté des deux : les hybrides Toyota tiennent
leur valeur, et une décote de 40 % sur 5 ans est dans la norme du segment.

**Mégane — 9 000 €.** Ce chiffre n'est *pas* obtenu en appliquant un taux de décote au
prix 2026 — ce serait compter deux fois une décote déjà encaissée. Il est ancré sur le
prix constaté des électriques compactes de 8-9 ans à batterie NMC d'environ 60 kWh, avec
trois facteurs à l'horizon :

- **Génération dépassée.** Le restylage est arrivé en juillet 2026 : batterie LFP 67 kWh,
  501 km WLTP, 165 kW en DC, à 37 500 € neuf
  ([L'argus](https://www.largus.fr/actualite-automobile/prix-megane-e-tech-restylee-2026-les-tarifs-et-la-gamme-de-la-compacte-electrique-revue-et-corrigee-2214407.html)).
  Les générations électriques antérieures décotent de 65 à 70 %, contre 45 à 55 % pour une
  électrique récente
  ([Autohero](https://www.autohero.com/fr/conseil/explorer/types-de-moteurs/electrique/decote/)).
- **Fin de garantie batterie.** 8 ans / 160 000 km. À 20 000 km/an, le seuil kilométrique
  tombe avant le seuil calendaire, et le plancher de valeur qu'il représente disparaît
  à l'horizon.
- **Concurrence.** Le segment se renouvelle vite, en autonomie comme en prix.

**Bande défendable : 7 500 à 11 000 €**, disponible en raccourcis dans l'UI. Aucune valeur
de cette bande ne rend l'opération favorable à 5 ans (test unitaire dédié) ; il faut
remonter au-dessus de 13 000 € pour repasser positif, ce qui suppose une décote de
seulement 50 % — sept points de moins que l'écart Toyota/Mégane ne le justifie.

Personne ne dispose de données de revente 2031 pour ce modèle. C'est une hypothèse
raisonnée, pas une mesure : le simulateur affiche désormais la décote qu'elle implique, et
la matrice de sensibilité indexe la revente sur le prix d'achat au même taux.

### Consommation Toyota — 5,3 L/100 km

**Valeur relevée sur l'ordinateur de bord du véhicule concerné**, pas une valeur
catalogue. Elle est élevée pour une Corolla hybride : le test de consommation réelle de
Motor1 sur une 1.8 Hybrid donne 3,9 L/100 en moyenne sur 967 km, 4,1 en mixte et 5,8 sur
autoroute
([Motor1](https://fr.motor1.com/reviews/344180/toyota-corolla-hybride-le-test-de-consommation-reelle/)).

Le profil d'usage retenu est un usage en **relief** (routes de moyenne montagne,
Haute-Loire, altitude ~600-1 000 m), et non autoroutier. C'est cohérent avec le relevé,
pour une raison structurelle : sur une montée soutenue, la batterie hybride (~1 kWh utile)
se vide en quelques minutes et le moteur Atkinson travaille seul, hors de sa plage de
rendement optimal ; en descente, la régénération sature presque immédiatement et le reste
part en chaleur dans les freins et le frein moteur. Un petit pack hybride est mal armé pour
le relief, plus mal encore que pour l'autoroute.

**Ce que ce profil n'implique pas.** En moyenne montagne et en usage rural, deux hypothèses
Mégane qu'on pourrait croire à corriger tiennent en réalité :

- **`publicChargingKm: 1500`** — un usage rural avec retour au domicile chaque soir
  maximise la part de recharge à domicile. 7,5 % des km sur borne publique est plausible,
  voire généreux.
- **`meganeConsumption: 20 kWh/100`** — le relief est le terrain où un pack de 60 kWh a un
  avantage *structurel* sur un pack hybride de 1 kWh : il absorbe la régénération que la
  Corolla dissipe. Sur un aller-retour à dénivelé net nul, une part significative de
  l'énergie de montée revient. Un essai sur Ioniq 5 en montagne relève 5,95 km/kWh de
  moyenne sur 240 km aller-retour, soit ~16,8 kWh/100
  ([Rouleur Électrique](https://rouleur-electrique.fr/voitures-electriques-en-montagne-recuperent-elles-vraiment-lenergie-perdue-en-montee/)).

**Le contre-argument, qui porte sur l'hiver.** Une batterie froide accepte mal les fortes
intensités de recharge, et le BMS bride la régénération : un retour de terrain fait état de
~20 % de capacité de récupération disponible à froid, avec frein moteur affaibli et freins
de service en surchauffe, et d'une consommation en forte hausse en montée
([fiches-auto](https://www.fiches-auto.fr/articles-auto/voiture-electrique/s-2702-voiture-electrique-inadaptee-pour-la-montagne-.php)).
Au Puy-en-Velay, les minimales passent sous 0 °C cinq mois par an, la plus basse moyenne
étant −2,1 °C en janvier
([Climate-Data](https://en.climate-data.org/europe/france/auvergne/le-puy-en-velay-7914/)).
L'avantage du gros pack est donc largement neutralisé quatre à cinq mois par an.

Ce retour de terrain est **un témoignage sur un profil alpin, pas une étude**, et un
plateau à 600-1 000 m n'est pas un col. À prendre comme un ordre de grandeur, pas comme une
mesure.

**Conclusion : les 20 kWh/100 sont conservés.** Une moyenne annuelle de 20 kWh/100 au
compteur électrique est cohérente avec un mélange de 15-17 en saison douce et 23-26 en
hiver. La bonne façon de trancher reste de relever la consommation moyenne réelle sur un
essai long de la Mégane dans ce relief, pas de la déduire.

## 3. Le kilométrage ne sauve pas le scénario à 5 ans

Le raisonnement « il suffit de rouler plus » a une limite structurelle. Avec les
hypothèses actuelles et les km sur borne publique indexés à 12 % :

| Km/an | Économie annuelle | Résultat à 5 ans | Résultat à 10 ans |
|---|---|---|---|
| 15 000 | 984 € | −6 059 € | −1 138 € |
| 20 000 | 1 319 € | −4 385 € | +2 210 € |
| 25 000 | 1 654 € | −2 710 € | +5 559 € |
| 30 000 | 1 989 € | −1 036 € | +8 908 € |
| **35 000** | 2 324 € | **+638 €** | +12 257 € |
| 40 000 | 2 659 € | +2 313 € | +15 606 € |

Il faut ~35 000 km/an pour équilibrer à 5 ans. Mais ces tableaux gardent la revente
Mégane fixée à 9 000 € **quel que soit le kilométrage**, ce qui est intenable : à
35 000 km/an sur 5 ans, la Mégane arrive à ~215 000 km, batterie hors garantie, et ne vaut
plus 9 000 €. Le kilométrage qui rend l'opération rentable est aussi celui qui détruit
l'hypothèse de revente sur laquelle repose cette rentabilité.

C'est la limite de modélisation la plus importante restant à lever (§ 5, piste 2).

## 4. Poids de chaque hypothèse

Effet sur le résultat complet à 5 ans d'un remplacement de chaque défaut, pris isolément :

| Hypothèse | Défaut | Variante | Effet |
|---|---|---|---|
| Km annuels | 20 000 | 30 000 | **+3 826 €** |
| Revente Mégane | 9 000 € | 11 000 € | +2 000 € |
| Prix essence | 2,019 €/L | 2,30 €/L | +1 489 € |
| Revente Mégane | 9 000 € | 7 500 € | −1 500 € |
| Entretien Mégane | 500 €/an | 800 €/an | −1 500 € |
| Km sur borne publique | 1 500 | 4 000 | −994 € |
| Installation recharge | 300 € | 1 200 € | −900 € |
| Prix essence | 2,019 €/L | 1,85 €/L | −896 € |
| Coût du capital | 0 % | 3 % | −761 € |
| Solaire gratuit | 620 kWh | 0 kWh | −473 € |
| Conso Mégane | 20 kWh/100 | 22 kWh/100 | −365 € |
| Conso Mégane | 20 kWh/100 | 18,5 kWh/100 | +273 € |

Points laissés en l'état, à arbitrer :

**`fuelPrice: 2.019`** — correspond au pic d'août 2026 (SP95-E10 à 1,98 €/L au 9 août,
gazole +17 % en 30 jours sur tensions géopolitiques,
[Supercarbu](https://supercarbu.fr/guide/prix-carburant-aout-2026/)). C'est plutôt
au-dessus de la moyenne longue française. Le sens de l'effet est symétrique et le
simulateur affiche son prix pivot, donc la valeur est vérifiable en un coup d'œil.

**`meganeMaintenance = toyotaMaintenance = 500 €`** — la parité se défend sur l'entretien
courant : révision 150-200 € contre 300-400 €, plaquettes qui durent 80-100 000 km, à peu
près compensés par des pneus 10-15 % plus chers et ~250 kg de plus
([Autocadre](https://www.autocadre.com/guide-occasion/3291-fiabilite-renault-megane-e-tech-electric-occasion.html)).
Ce que la ligne ne couvre pas, c'est le **risque de panne hors garantie** : à 5 ans, une
Mégane de 2022-2023 est sortie de la garantie véhicule. Sur 85 témoignages recensés,
20 concernent le système de charge et 7 le moteur électrique, avec des chargeurs embarqués
à 1 500-2 000 € et des pompes à chaleur à 800-1 200 €
([fiches-auto](https://www.fiches-auto.fr/fiabilite-renault/fiabilite-701-pannes-renault-megane-e-tech.php)).
What Car? classe la Mégane 8ᵉ sur 20 électriques mais Renault 20ᵉ sur 30 marques, avec des
infiltrations d'eau et des bruits de suspension arrière décrits par certains
concessionnaires comme un défaut sans solution
([What Car?](https://www.whatcar.com/renault/megane-e-tech/hatchback/used-review/n28391/reliability)).
Le modèle provisionne les pneus hiver mais pas ça. Une ligne dédiée serait plus lisible
qu'un gonflement de `meganeMaintenance` (§ 5, piste 3).

**Le profil rural aggrave spécifiquement ce poste**, et c'est l'effet le plus important du
profil d'usage sur le modèle — davantage que l'énergie. Toute intervention sur les organes
haute tension (chargeur embarqué, onduleur, BMS, pack) exige un atelier habilité, donc en
pratique le réseau Renault, sans concurrence sur le tarif et avec les délais de pièces déjà
signalés par What Car?. En Haute-Loire, cela veut dire peu d'options et des trajets longs,
là où la Corolla est prise en charge par n'importe quel garage indépendant. La même panne
ne coûte pas la même chose selon le code postal, et le modèle n'a aucune variable pour ça.

Le profil rural pousse aussi la **revente** vers le bas de la bande : la demande d'occasion
électrique est plus mince hors des zones urbaines. Et l'**autonomie hivernale** — 60 kWh à
23-26 kWh/100 donne ~230-260 km réels — reste confortable en usage local mais contraignante
sur les longs trajets, avec 213 points de charge dans le département dont 19 au Puy-en-Velay,
en majorité en courant alternatif
([Electromaps](https://www.electromaps.com/en/charging-stations/france/haute-loire)).

**`capitalRate: 0`** — le champ existe, mais à zéro les 7 480 € immobilisés sont gratuits.

**`chargingInstallation: 300`** — correspond à une prise renforcée (~2,3 kW, ~14 h pour un
plein), pas à une wallbox 7 kW posée (800-1 500 €). Cohérent si c'est le choix retenu,
mais autant le nommer.

**`freeSolarKwh: 620` à 0 €/kWh** — ces kWh ont un coût d'opportunité : autoconsommation
évitée ailleurs, ou revente en obligation d'achat.

**`towHitch: 1000`** — la ligne suppose la Mégane E-Tech homologuée pour la traction. À
confirmer chez Renault. Si elle ne l'est pas, la ligne disparaît mais la perte d'usage
break → compacte ne se chiffre pas en euros et sort du modèle.

**Deux hypothèses restent prudentes contre la Mégane**, et il faut le dire :
`meganeConsumption: 20 kWh/100` est au-dessus du réel mesuré en usage mixte (15,6 en été,
17,9 en hiver, plus ~10 % de pertes de charge, soit ~18,5
[Automobile Propre](https://www.automobile-propre.com/articles/essai-renault-megane-e-tech-ev60-quelle-difference-de-consommation-entre-ete-et-hiver/)),
et le modèle charge honnêtement la Mégane de 700 € de pneus hiver et 1 000 € d'attelage.
L'écart d'assurance retenu (+115 €/an) est cohérent avec le baromètre Assurland de février
2026, qui relève **+45 % de prime sur les électriques en deux ans, désormais au-dessus des
essence et diesel — une première en France**
([via Boursorama](https://www.boursorama.com/budget/assurances/actualites/voitures-electriques-l-assurance-explose-et-coute-desormais-plus-cher-que-pour-les-thermiques-91e09487f7d7351cf3c0967f50632fa5)).

## 5. Correction : prix d'achat et revente étaient décorrélés

`renderMatrix()` faisait varier `meganePrice` sur l'axe vertical **en gardant
`meganeResaleValue` figée**. La colonne « Mégane à 22 000 € » et la colonne
« Mégane à 30 000 € » se revendaient donc au même prix, ce qui n'a pas de sens économique.
Même problème dans `thresholds().maxMeganePrice`.

La correction n'introduit aucune hypothèse : elle déduit le taux de revente des valeurs
saisies (`impliedResaleRatio()`, soit 9 000 / 26 000 = 34,6 %) et le maintient constant
quand le prix varie (`withMeganePrice()`). Au prix courant le couplage est neutre par
construction — c'est le point d'ancrage.

| Prix Mégane | Revente figée (avant) | Revente indexée (après) |
|---|---|---|
| 20 000 € | +1 973 € | −104 € |
| 22 000 € | −27 € | −1 412 € |
| 24 000 € | −2 027 € | −2 719 € |
| **26 000 € (ancrage)** | **−4 027 €** | **−4 027 €** |
| 28 000 € | −6 027 € | −5 335 € |
| 30 000 € | −8 027 € | −6 642 € |

La matrice **pivote** autour du scénario courant au lieu de se translater : le bug rendait
le modèle trop optimiste sur les Mégane bon marché et trop pessimiste sur les Mégane
chères. Le prix plafond passe de 21 973 € à **19 841 €**.

À noter, le sens de ce pivot dépend du taux de revente : à l'ancien ratio de 50 %, la même
correction *relevait* le plafond (de 27 079 à 28 158 €). Cohérence interne et niveau de
décote sont deux questions distinctes ; `maxMeganePriceFixedResale` reste exposé dans le
retour de `thresholds()` pour comparaison.

## 6. Pistes non implémentées

1. **Saisir les reventes en taux plutôt qu'en montants**, avec un défaut dépendant de
   l'horizon. Rendrait `renderResaleWarning()` inutile.
2. **Faire dépendre les reventes du kilométrage cumulé** — la limite du § 3. Aujourd'hui,
   à 40 000 km/an sur 10 ans, la Mégane est supposée valoir 9 000 € avec 400 000 km.
3. **Ligne « provision panne hors garantie »**, distincte de l'entretien courant, avec un
   défaut asymétrique entre les deux véhicules.
4. **Consommation saisonnière**, plutôt qu'une valeur annuelle unique : l'écart été/hiver
   atteint 50 % en relief, et c'est en hiver que la régénération est bridée. Un modèle à
   deux saisons serait plus juste qu'un ajustement de la moyenne.
5. **Option neuf.** À 26 000 € pour une pré-restylage hors garantie, l'alternative
   pertinente n'est pas seulement la Corolla mais la restylée neuve à 37 500 €, soit
   30 000-34 000 € après prime CEE (3 314 à 7 365 € selon décile de revenu,
   [Hellio](https://particulier.hellio.com/blog/financement/coup-de-pouce-voiture-electrique)),
   avec 8 ans de garantie batterie qui repart à zéro et sans le risque de panne du § 4.
   Une troisième colonne, pas un réglage.

## 7. Ce que le modèle fait bien

Pour situer la critique : la mécanique financière est correcte et je n'y ai pas trouvé
d'erreur.

- `accumulationFactor()` / `futureValue()` sont cohérents, et surtout la trésorerie et les
  reventes sont bien datées au même instant `t = horizon` dans `resultAtHorizon()` — pas de
  mélange nominal / actualisé, qui est l'erreur classique de ce type de calcul.
- `paybackYears()` gère correctement le cas `savings ≤ outlay × rate` → jamais rentable.
- Séparer « trésorerie avant revente » et « résultat complet » est exactement le bon
  découpage : c'est ce qui rend le § 1 lisible sans avoir à ouvrir le code.
- Deux seuils calculés (prix plafond, prix d'essence pivot) plutôt qu'un verdict unique.
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
- [Le Journal Auto — coût de recharge 2026, domicile et bornes](https://lejournalauto.com/categorie/electrique/cout-recharge-voiture-electrique-2026-prix-kwh-maison-borne)
- [Rouleur Électrique — récupération d'énergie en montagne](https://rouleur-electrique.fr/voitures-electriques-en-montagne-recuperent-elles-vraiment-lenergie-perdue-en-montee/)
- [fiches-auto — la voiture électrique en montagne, retour de terrain](https://www.fiches-auto.fr/articles-auto/voiture-electrique/s-2702-voiture-electrique-inadaptee-pour-la-montagne-.php)
- [Climate-Data — températures mensuelles au Puy-en-Velay](https://en.climate-data.org/europe/france/auvergne/le-puy-en-velay-7914/)
- [Electromaps — stations de recharge en Haute-Loire](https://www.electromaps.com/en/charging-stations/france/haute-loire)
- [Autohero — décote des électriques 2026](https://www.autohero.com/fr/conseil/explorer/types-de-moteurs/electrique/decote/)
- [L'argus — prix Mégane E-Tech restylée 2026](https://www.largus.fr/actualite-automobile/prix-megane-e-tech-restylee-2026-les-tarifs-et-la-gamme-de-la-compacte-electrique-revue-et-corrigee-2214407.html)
- [Hellio — coup de pouce / prime CEE 2026](https://particulier.hellio.com/blog/financement/coup-de-pouce-voiture-electrique)
- [Boursorama — baromètre Assurland février 2026, assurance des électriques](https://www.boursorama.com/budget/assurances/actualites/voitures-electriques-l-assurance-explose-et-coute-desormais-plus-cher-que-pour-les-thermiques-91e09487f7d7351cf3c0967f50632fa5)
