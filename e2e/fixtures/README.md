# E2E fixtures

## face.jpg

- Source: [Andrea Salinas, Official Portrait, 118th Congress](https://commons.wikimedia.org/wiki/File:Andrea_Salinas,_Official_Portrait,_118th_Congress.jpg), Wikimedia Commons, by the US House of Representatives (2023-01-03).
- License: public domain, a work of the US federal government.
- Changes: Commons' 1000 px thumbnail, scaled to 1000 px on its longer side with `sips -Z 1000`.

One adult, facing the camera in even studio light, with no filter. `e2e/analysis-flow.spec.ts` uploads it and expects it to pass the on-device photo check. If a change to the check's thresholds makes it fail, pick another public-domain or CC0 photo; never loosen a threshold for the fixture.

Why not a daylight selfie: of 26 CC0 and public-domain portraits screened on 2026-10-03, the daylight selfies failed the check. Glasses gave `tint`, and smiles, turned heads and graded photos gave `dark`. Three frontal official portraits passed. `t6-eval-set` measures those false rejects.
