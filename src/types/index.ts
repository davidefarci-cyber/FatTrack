// Bottom tab a 5 voci: Barcode · Preferiti · Home · Storico · Cerca.
// Settings resta registrato come Tab.Screen ma non è più visibile nella
// bar — si raggiunge dall'icona ingranaggio in alto a destra di Home.
// La Home è centrale nell'UI con FAB rialzato; `initialRouteName` sul
// Tab.Navigator garantisce comunque l'avvio sulla Home.
export type TabParamList = {
  Barcode: undefined;
  Favorites: undefined;
  Home: undefined;
  History: undefined;
  FoodSearch: undefined;
  Settings: undefined;
};
