/**
 * Calques de rendu de la scène.
 *
 * LE PROBLÈME QUE CE FICHIER RÉSOUT. `ContactShadows` calcule son ombre en
 * rendant la scène ENTIÈRE dans une passe de profondeur, avec une caméra
 * orthographique posée sur le plateau et tournée vers le haut. « La scène
 * entière » inclut les fausses lumières, qui sont de la géométrie comme le
 * reste : le rai de la fenêtre traverse le bureau en biais, et il se retrouvait
 * projeté sur le bois comme un grand rectangle sombre — une ombre portée par un
 * faisceau de lumière.
 *
 * La solution tient au fait qu'une caméra Three ne voit QUE le calque 0 par
 * défaut. Les fausses lumières sont donc déplacées sur un calque à elles, et
 * c'est la caméra de la scène — elle seule — qui l'active. Aucune caméra
 * annexe (ombres de contact, et toute passe future du même genre) n'a besoin
 * d'être au courant.
 */

/**
 * Fausses lumières : flaques, faisceau, poussière, liserés. Tout ce qui rend la
 * lumière VISIBLE sans être un objet de la pièce, et qui ne doit donc jamais
 * porter d'ombre.
 */
export const FAKE_LIGHT_LAYER = 1;
