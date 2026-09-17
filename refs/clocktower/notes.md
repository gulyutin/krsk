# Clock tower and City Administration — reference notes

Written from 21 photos in this folder (day and night, straight-on, angled, a close-up of the dial, two elevated views).
Best for proportions: `images (9).jpeg` (tower straight-on, telephoto), `images (6).jpeg`, `images (5).jpeg` (upper tower close-up), `images (8).jpeg` (dial), `images (11).jpeg` and `images (12).jpeg` (tower next to the building).

## The complex

One landmark: the **clock tower is attached to the end of the City Administration building**, not freestanding.
The tower rises to roughly twice the height of the building. Square in front with a fountain, flagpole, fir trees and flower beds.

## Tower, bottom to top (share of height up to the spire tip)

| Part | Height | Shape |
|---|---|---|
| Lower shaft | ~43% | massive square block, taupe-grey cladding with faint vertical panel lines; slightly wider collar at its top |
| Ledge | thin | projecting ring with a small railing where the shaft steps in |
| Fluted stage | ~13% | narrower square (~0.7 of lower width), deep vertical grooves on each side |
| Clock stage | ~17% | square, a large round **black dial** on all 4 sides, white numerals and hands; the dial fills most of the face |
| White band | ~5% | light stepped cornice above the dials |
| Pyramid roof | ~10% | steep, dark grey-gold with a diagonal grid |
| Spire | ~15% | thin needle with a small gilded finial |

## Administration building

- Long slab, ~7–8 storeys, **white vertical fins** between windows give a strong vertical rhythm; thin horizontal floor lines.
- Glazed, darker ground floor; a long **flat canopy** on thin columns over the main entrance.
- The facade bends: two long wings meet at an obtuse angle; a lower connecting block sits between the tower and the main slab.
- Red lettering along the roof edge ("КРАСНОЯРСК…").

## Recognizable details (priority order)

1. Tall square tower with **black round clocks on four sides**.
2. Steep pyramid top and a needle spire.
3. Step from a massive lower shaft to a narrower fluted upper stage.
4. Long white building with vertical fins next to it, noticeably lower than the tower.
5. Entrance canopy, red roof lettering, fountain and flagpole in front.

## Suggested palette additions

`towerStone` ~#8d8578, `towerStoneDark` ~#6f685e, `dial` ~#1c2230, `dialMarks` ~#f2f2ee, `pyramidRoof` ~#5e5a52, `officeWhite` ~#eef0f0, `officeGlass` ~#6f8fa8, `signRed` ~#d8322a, `flagRed` ~#c8202a.

## Primitive plan

Tower: stacked boxes; grooves as thin instanced boxes; dials as flat cylinders; hour marks and hands as thin boxes; roof as a 4-sided `ConeGeometry`; spire as a thin cone.
Building: slab boxes per wing; fins, floor lines and windows as instanced boxes.
Roof lettering: pixel letters from small instanced boxes (one draw call).
