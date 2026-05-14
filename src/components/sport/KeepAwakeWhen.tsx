import { useKeepAwake } from 'expo-keep-awake';

// Wrapper "mount-to-activate" per expo-keep-awake: usato dalle 3 superfici
// sport che devono tenere lo schermo acceso (sessione live, round Tabata,
// timer pausa standalone). Il caller monta/smonta questo componente in base
// a una condizione locale + flag globale `keepAwakeEnabled`. Render = null,
// solo side-effect via hook.
//
// Tag distinti per superficie così Android può gestire più keep-awake
// concorrenti — utile in debug e nel raro caso di sovrapposizione.

type Props = { tag: string };

export function KeepAwakeWhen({ tag }: Props) {
  useKeepAwake(tag);
  return null;
}
