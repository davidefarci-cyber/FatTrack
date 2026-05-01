// Bottom tab a 5 voci: Barcode · Preferiti · Home · Storico · Cerca.
// Settings e Profile restano registrati come Tab.Screen ma non sono visibili
// nella bar — si raggiungono dalle icone in alto a destra di Home (utente +
// ingranaggio). La Home è centrale nell'UI con FAB rialzato; `initialRouteName`
// sul Tab.Navigator garantisce comunque l'avvio sulla Home.
export type TabParamList = {
  Barcode: undefined;
  Favorites: undefined;
  Home: undefined;
  History: undefined;
  FoodSearch: undefined;
  Settings: undefined;
  Profile: undefined;
};

// Bottom tab della modalità Sport: Timer · Schede · Home · Storico · Esercizi.
// `SportSettings` è registrato ma nascosto dalla bar (raggiungibile dal cog
// icon di SportHomeScreen, analogo a Settings in modalità diet).
export type SportTabParamList = {
  Timer: undefined;
  Workouts: undefined;
  Home: undefined;
  History: undefined;
  Exercises: undefined;
  SportSettings: undefined;
};
