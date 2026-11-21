// ともに歩む企業・団体のロゴ（正本）。
// 2026-11-19: /studio/works に追加。ロゴは各社の公式サイトから取得。
//   プリンシパル・ROUGH LABO・神河町・和田興産は、オーナーが2026-11-19に掲載を指示 (許諾の確認は別途)。
// 2026-11-21: コーポレート「会社について」(/corp#company) にも横に流れる帯で掲載。
// 2026-11-21: 一般社団法人日本賑い観光協会（JBTA）を追加。ロゴは mbcpj.com のサイトアイコン（144px・原寸）。
// 追加・削除はここだけを直せば、両ページに反映される。
export type PartnerLogo = { name: string; src: string; h: number };

export const PARTNER_LOGOS: readonly PartnerLogo[] = [
  { name: '株式会社Stemlink', src: '/studio/logos/stemlink.png', h: 40 },
  { name: 'ラグナボーテ株式会社（Laguna Beauté）', src: '/studio/logos/laguna-beaute.png', h: 34 },
  { name: '株式会社TOAI（ジャンカラ）', src: '/studio/logos/jankara.png', h: 44 },
  { name: 'JRC 日本記録協会', src: '/studio/logos/jrc.png', h: 56 },
  { name: '朝日館（Asahikan）', src: '/studio/logos/asahikan.png', h: 48 },
  { name: '株式会社プリンシパル', src: '/studio/logos/principal.png', h: 34 },
  { name: '株式会社ROUGHLABO（北野メディウム邸「真珠の館」）', src: '/studio/logos/roughlabo.svg', h: 32 },
  { name: '神河町', src: '/studio/logos/kamikawa.png', h: 52 },
  { name: '和田興産株式会社', src: '/studio/logos/wada.png', h: 44 },
  { name: '一般社団法人日本賑い観光協会（JBTA）', src: '/studio/logos/jbta.png', h: 60 },
];
