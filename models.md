# 3D Models — Virtual Office Playground

## File Placement

All models go in **`src/renderer/assets/models/`** as `.glb` (glTF Binary) files.

```
src/renderer/assets/models/
├── environment/
│   ├── floor.glb
│   ├── walls.glb
│   ├── ceiling-light.glb
│   ├── window-wall.glb
│   └── pillar.glb
├── workstation/
│   ├── desk.glb
│   ├── chair.glb
│   ├── monitor.glb
│   ├── keyboard.glb
│   ├── mouse-and-pad.glb
│   ├── desk-lamp.glb
│   └── cables.glb
├── characters/
│   ├── base-character.glb      ← shared body with animation clips
│   └── hats/
│       ├── hat-claude.glb      ← halo ring
│       ├── hat-node.glb        ← hexagon badge
│       ├── hat-git.glb         ← branch antennae
│       ├── hat-python.glb      ← two-tone beret
│       ├── hat-docker.glb      ← whale fin
│       ├── hat-powershell.glb  ← chevron visor
│       ├── hat-ssh.glb         ← satellite dish
│       ├── hat-vim.glb         ← V-antennas
│       ├── hat-build.glb       ← hard hat
│       ├── hat-test.glb        ← checkmark
│       └── hat-database.glb    ← cylinder stack
├── props/
│   ├── coffee-mug.glb
│   ├── book-stack.glb
│   ├── potted-plant.glb
│   ├── headphones.glb
│   ├── sticky-notes.glb
│   ├── pen-holder.glb
│   ├── water-bottle.glb
│   └── rubber-duck.glb
└── office/
    ├── whiteboard.glb
    ├── server-rack.glb
    ├── water-cooler.glb
    ├── couch.glb
    ├── coffee-table.glb
    ├── trash-bin.glb
    ├── filing-cabinet.glb
    ├── partition.glb
    ├── wall-clock.glb
    ├── wall-art.glb
    └── area-rug.glb
```

Loading in code (via Three.js `GLTFLoader`):

```js
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
// Paths are relative to the HTML file (src/renderer/pages/terminal.html)
loader.load('../assets/models/workstation/desk.glb', (gltf) => {
  scene.add(gltf.scene);
});
```

---

## Technical Specs (All Models)

| Property           | Value                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Format**         | glTF 2.0 Binary (`.glb`)                                                                                                                    |
| **Style**          | Low-poly, flat-shaded, clean/stylized (NOT realistic)                                                                                       |
| **Scale**          | 1 unit = 1 meter                                                                                                                            |
| **Origin**         | Bottom-center (floor contact point)                                                                                                         |
| **Up axis**        | Y-up                                                                                                                                        |
| **Materials**      | PBR metallic-roughness. Solid colors, no image textures needed                                                                              |
| **Poly budget**    | See per-model details below                                                                                                                 |
| **Tintable parts** | Use neutral base color (white/light grey) on meshes meant to be tinted at runtime via `material.color.setHex()`. Name these meshes clearly. |
| **Naming**         | All meshes must be named in the glTF so code can use `getObjectByName()`                                                                    |

---

## Category 1: Environment / Room

### 1. Floor Tiles — `environment/floor.glb`

- **Description**: Office floor with subtle tile grid pattern baked into the texture
- **Dimensions**: 60 × 60 units (single large plane)
- **Tris**: ~2–100 (simple plane, detail lives in normal map)
- **Materials**: Dark matte finish (roughness 0.9, metalness 0.05). Catppuccin `#181825` base color
- **Textures**: Optional tiling normal map for subtle tile grid. No wireframe overlay — bake the grid into the normal/roughness
- **Notes**: Receives shadows. Replaces current `PlaneGeometry` + `GridHelper`

### 2. Walls — `environment/walls.glb`

- **Description**: Back wall and two side walls enclosing the office space
- **Dimensions**: ~60 units wide, ~30 deep, ~5 units tall
- **Tris**: ~100–200
- **Materials**: Dark matte (`#1e1e2e`). Optional subtle baseboard trim at the bottom (slightly lighter `#313244`)
- **Mesh names**: `wall_back`, `wall_left`, `wall_right`, `baseboard`
- **Notes**: L-shaped or 3-wall enclosure. Open front so the camera can see in

### 3. Ceiling Light — `environment/ceiling-light.glb`

- **Description**: Rectangular LED panel light, recessed or surface-mounted
- **Dimensions**: ~2.0 × 0.6 × 0.1 units
- **Tris**: ~50–100
- **Materials**: White frame + emissive panel face (`emissiveIntensity: 0.5`)
- **Mesh names**: `frame`, `panel` (emissive face)
- **Notes**: Place 3–4 of these in rows across the ceiling at Y=4.5. Each one can parent a Three.js `RectAreaLight` or `PointLight` in code

### 4. Window Wall — `environment/window-wall.glb`

- **Description**: Floor-to-ceiling glass window panels along one side of the room
- **Dimensions**: ~30 units wide × 5 units tall
- **Tris**: ~200–400
- **Materials**: Dark metal frame (`#313244`), semi-transparent frosted glass panes (opacity 0.2, roughness 0.1). Optional: a simple backdrop plane behind the glass showing an abstract night cityscape or gradient
- **Mesh names**: `frame`, `glass_pane_1`…`glass_pane_N`, `backdrop` (optional)
- **Notes**: Place along one wall (e.g. x = -30). Frame dividers between each pane

### 5. Pillar — `environment/pillar.glb`

- **Description**: Structural office column
- **Dimensions**: ~0.5 × 0.5 × 5.0 units (square) or ~0.3 radius × 5.0 tall (round)
- **Tris**: ~50–100
- **Materials**: Dark concrete finish (`#313244`, roughness 0.95)
- **Notes**: Place every ~15 units to break up the space. Receives/casts shadows

---

## Category 2: Workstation Furniture

### 6. Desk — `workstation/desk.glb`

- **Description**: Modern office desk with clean lines
- **Dimensions**: 2.0 wide × 1.2 deep × 0.85 tall (top surface at Y=0.85)
- **Tris**: ~500–800
- **Materials**: Dark wood or matte grey top surface (roughness 0.7, metalness 0.1, color `#45475a`). Darker legs (`#313244`)
- **Mesh names**: `top_surface`, `leg_fl`, `leg_fr`, `leg_bl`, `leg_br`, `grommet` (cable hole)
- **Details**: Rounded/beveled top edges. Optional cable management grommet hole near the back. 4 legs or panel sides
- **Notes**: Casts + receives shadows. Character sits behind the desk (Z+0.85 from desk origin)

### 7. Office Chair — `workstation/chair.glb`

- **Description**: Ergonomic rolling office chair
- **Dimensions**: ~0.55 wide × ~1.1 tall (seat at Y=0.6, back top at Y=1.2)
- **Tris**: ~800–1200
- **Materials**: Fabric seat/back in neutral grey (tintable at runtime to agent's accent color). Dark metal frame/base (`#313244`)
- **Mesh names**: `seat` (tintable), `backrest` (tintable), `armrest_l`, `armrest_r`, `gas_lift`, `base_star`, `wheel_1`…`wheel_5`
- **Details**: 5-star wheeled base, gas lift cylinder, armrests, curved ergonomic backrest. Seat/backrest are tinted to the agent's body color at runtime
- **Notes**: Default position: facing desk (rotation Y=π). Can rotate slightly for resting pose. Pivot at gas lift center

### 8. Monitor — `workstation/monitor.glb`

- **Description**: Widescreen flat monitor on a stand
- **Dimensions**: Screen area ~0.9 × 0.6 units, body depth ~0.06
- **Tris**: ~300–500
- **Materials**: Dark bezel/body (`#313244`, roughness 0.4, metalness 0.2). Stand/base same material
- **Mesh names**: `bezel`, `screen_face` (IMPORTANT — separate flat quad for CanvasTexture), `stand_arm`, `stand_base`
- **Details**: Thin bezel frame around the screen. `screen_face` must be a separate flat plane mesh (0.8 × 0.5) facing +Z, flush with the bezel front. This is where the dynamic CanvasTexture is mapped at runtime. Single post stand + rectangular base (or monitor arm clamp)
- **Critical**: The `screen_face` mesh must be a separate flat plane so code can apply a `CanvasTexture` material to it independently. UV-mapped to fill the full 0→1 range

### 9. Keyboard — `workstation/keyboard.glb`

- **Description**: Low-profile mechanical keyboard
- **Dimensions**: ~0.6 × 0.25 × 0.03 units
- **Tris**: ~200–400
- **Materials**: Dark body (`#45475a`, roughness 0.6). Key caps slightly lighter or baked into normal map
- **Mesh names**: `body`, `keys` (optional separate mesh for key surface)
- **Details**: Slightly angled (back edge ~0.01 higher). Key caps can be modeled individually for quality or implied via normal map for performance
- **Notes**: Placed on desk at Y=0.9, Z=0.2

### 10. Mouse + Pad — `workstation/mouse-and-pad.glb`

- **Description**: Ergonomic mouse sitting on a mousepad
- **Dimensions**: Mouse ~0.06 × 0.1 × 0.03. Pad ~0.25 × 0.2 × 0.005
- **Tris**: ~100–200 total
- **Materials**: Mouse: dark (`#45475a`). Pad: slightly different shade (`#313244`, roughness 0.95)
- **Mesh names**: `mouse`, `mousepad`
- **Notes**: Placed to the right of the keyboard on the desk

### 11. Desk Lamp — `workstation/desk-lamp.glb`

- **Description**: Adjustable articulated desk lamp
- **Dimensions**: ~0.4 tall when extended, base ~0.12 diameter
- **Tris**: ~200–400
- **Materials**: Dark metal (`#45475a`, metalness 0.4). Emissive bulb/inner shade (warm white `#f9e2af`, `emissiveIntensity: 0.8`)
- **Mesh names**: `base`, `lower_arm`, `upper_arm`, `shade`, `bulb` (emissive)
- **Details**: Clamp or weighted base. Two articulated arm segments. Cone shade directing light down. `bulb` mesh is emissive
- **Notes**: Code can attach a `PointLight` at the bulb position. Place on the left or right side of some desks. Not every desk needs one — adds variety

### 12. Cables — `workstation/cables.glb`

- **Description**: Cable bundle running from monitor/keyboard behind desk
- **Dimensions**: ~0.02 radius tubes, ~0.5–1.0 length
- **Tris**: ~50–100
- **Materials**: Dark (`#1e1e2e`, roughness 0.8)
- **Details**: 2–3 curved tubes (use a low-poly tube/path). Run from the back of the monitor down behind the desk
- **Notes**: Optional detail. Adds realism without much cost

---

## Category 3: Characters

All characters use the **same base body** with different hats attached. The body is color-tinted at runtime.

### 13. Base Character — `characters/base-character.glb`

- **Description**: Blocky/voxel-style humanoid (Minecraft-inspired proportions)
- **Total height**: ~2.15 units standing
- **Tris**: ~500–800
- **Materials**: All tintable meshes in neutral white/light grey. Eyes white with dark pupils. Apply agent colors at runtime
- **Mesh names** (MUST match exactly):
  - `head` — 0.55 × 0.55 × 0.5 box, center at Y=1.87
  - `torso` — 0.6 × 0.7 × 0.4 box, center at Y=1.2
  - `arm_l` — 0.18 × 0.55 × 0.2 box, center at (-0.45, 1.15, 0.1), pivot at top (shoulder)
  - `arm_r` — 0.18 × 0.55 × 0.2 box, center at (0.45, 1.15, 0.1), pivot at top (shoulder)
  - `leg_l` — 0.22 × 0.5 × 0.25 box, center at (-0.16, 0.55, 0), pivot at top (hip)
  - `leg_r` — 0.22 × 0.5 × 0.25 box, center at (0.16, 0.55, 0), pivot at top (hip)
  - `eye_l` — 0.08 × 0.1 × 0.06 white box at (-0.12, 1.9, 0.26)
  - `eye_r` — 0.08 × 0.1 × 0.06 white box at (0.12, 1.9, 0.26)
  - `pupil_l` — 0.04 × 0.06 × 0.02 dark box at (-0.12, 1.89, 0.3)
  - `pupil_r` — 0.04 × 0.06 × 0.02 dark box at (0.12, 1.89, 0.3)
- **Tint groups**: `head`, `torso`, `arm_l`, `arm_r` → body color. `leg_l`, `leg_r` → accent color
- **Embedded animation clips**:
  - `typing` — arms alternate pumping (sin wave on arm rotation.x, ±0.15 rad at 6 Hz), slight head bob (±0.05 rad Z at 1.5 Hz, ±0.015 Y at 2 Hz), subtle body sway (±0.02 rad Z at 1.2 Hz). Loop duration: ~2s
  - `idle_sit` — torso leans back slightly (+0.05 rad X with ±0.03 sin at 0.5 Hz), head tilts (+0.08 rad X with ±0.04 sin at 0.3 Hz), arms relaxed (-0.1 rad X, ±0.15 rad Z outward), slow breathing motion. Loop duration: ~4s
  - `blink` — eye_l + eye_r scale.y to 0.1 and back to 1.0 over 0.15s. Triggered every ~4s
- **Notes**: Character is positioned sitting in the chair (Y=0 is floor, character origin at feet). The seated position is achieved by moving the character group to Z=0.85 relative to the desk

### 14–24. Character Hats — `characters/hats/hat-*.glb`

Each hat is a small standalone model that gets attached to the character's head at runtime. Origin at the **base of the hat** (where it touches the top of the head, Y=2.15).

| # | File | Process Type | Description | Tris | Details |
|---|------|-------------|-------------|------|---------|
| 14 | `hat-claude.glb` | `claude` | Glowing halo ring | ~100 | Torus (0.3 radius, 0.04 tube, 16 segments). Emissive mauve glow. Floats at Y=0.15 above head top. Mesh name: `halo` |
| 15 | `hat-node.glb` | `node` | Hexagonal badge | ~50 | Flat hexagon (0.25 radius, 0.04 thick). Green. Sits on top of head. Mesh name: `badge` |
| 16 | `hat-git.glb` | `git` | Branch antennae + tips | ~150 | Two cylinders (0.02 radius, 0.35 tall) at ±15° splay. Sphere tip (0.06 radius) on each. Red/pink. Mesh names: `antenna_l`, `antenna_r`, `tip_l`, `tip_r` |
| 17 | `hat-python.glb` | `python` | Two-tone beret | ~100 | Half-sphere (0.28 radius). Split into two halves: blue + yellow (like the Python logo). Mesh names: `beret_blue`, `beret_yellow` |
| 18 | `hat-docker.glb` | `docker` | Whale fin | ~50 | Triangular dorsal fin (0.12 base, 0.25 tall). Cyan/blue. Optional small tail at back. Mesh names: `fin`, `tail` |
| 19 | `hat-powershell.glb` | `powershell` | Chevron visor | ~50 | Flat ">" angular shape on forehead. Blue with dark accent. Mesh name: `chevron` |
| 20 | `hat-ssh.glb` | `ssh` | Satellite dish + rod | ~100 | Inverted half-sphere dish (0.15 radius) + thin rod (0.02 radius, 0.2 tall). Green. Mesh names: `dish`, `rod` |
| 21 | `hat-vim.glb` | `vim` | V-shaped antennas | ~80 | Two small cones (0.08 base, 0.3 tall) angled outward in V. Green. Mesh names: `cone_l`, `cone_r` |
| 22 | `hat-build.glb` | `build` | Hard hat | ~150 | Dome top (cylinder 0.35→0.38 radius, 0.18 tall) + flat brim ring (0.42 radius, 0.04 tall). Orange/peach. Optional chin strap. Mesh names: `dome`, `brim`, `strap` |
| 23 | `hat-test.glb` | `test` | Checkmark | ~50 | ✓ shape made of two boxes at an angle. Green. Sits above head. Mesh name: `checkmark` |
| 24 | `hat-database.glb` | `database` | Cylinder stack | ~100 | 2–3 stacked thin cylinders (0.22 radius, 0.08 tall each, slight gap between). Teal. Mesh names: `cylinder_1`, `cylinder_2`, `cylinder_3` |

---

## Category 4: Desk Props

Small items placed on/around desks for variety. Not every desk needs every prop — the code randomizes placement.

### 25. Coffee Mug — `props/coffee-mug.glb`

- **Dimensions**: ~0.08 tall, 0.05 diameter
- **Tris**: ~80–120
- **Materials**: Tintable ceramic body (neutral white → tinted to agent color at runtime). Dark liquid inside (if visible from above)
- **Mesh names**: `body` (tintable), `handle`, `liquid`
- **Placement**: On desk surface, to the side of the keyboard (~X=±0.6, Y=0.9, Z=0.15)

### 26. Book Stack — `props/book-stack.glb`

- **Dimensions**: ~0.2 × 0.15 × 0.1 total stack
- **Tris**: ~50–100
- **Materials**: 2–3 flat boxes at slightly different angles, each a different subtle color (`#89b4fa`, `#a6e3a1`, `#f9e2af`)
- **Mesh names**: `book_1`, `book_2`, `book_3`
- **Placement**: Corner of desk (~X=0.8, Y=0.9, Z=-0.4)

### 27. Potted Plant — `props/potted-plant.glb`

- **Dimensions**: ~0.15 tall total (pot ~0.06 tall, leaves ~0.09)
- **Tris**: ~100–200
- **Materials**: Terracotta pot (`#fab387`), green leaves (`#a6e3a1`), dark soil inside (`#1e1e2e`)
- **Mesh names**: `pot`, `soil`, `leaf_1`…`leaf_5`
- **Details**: Cylindrical pot with 3–5 simple flat/blocky stylized leaves
- **Placement**: Edge of desk or on top of filing cabinet

### 28. Headphones — `props/headphones.glb`

- **Dimensions**: ~0.2 wide (across band), ear cups ~0.06 diameter
- **Tris**: ~150–250
- **Materials**: Dark plastic (`#313244`, roughness 0.5)
- **Mesh names**: `band`, `cup_l`, `cup_r`, `cushion_l`, `cushion_r`
- **Placement**: Hanging on the monitor corner or lying flat on the desk

### 29. Sticky Notes — `props/sticky-notes.glb`

- **Dimensions**: ~0.06 × 0.06 × 0.002 each
- **Tris**: ~20–30 total
- **Materials**: 2–3 small quads in pastel colors (`#f9e2af` yellow, `#f5c2e7` pink, `#89b4fa` blue)
- **Mesh names**: `note_1`, `note_2`, `note_3`
- **Placement**: Stuck to the monitor bezel edge, slightly rotated

### 30. Pen Holder — `props/pen-holder.glb`

- **Dimensions**: ~0.05 diameter × 0.08 tall
- **Tris**: ~50–80
- **Materials**: Dark cup (`#45475a`), pens/pencils in assorted colors
- **Mesh names**: `cup`, `pen_1`, `pen_2`, `pen_3`
- **Placement**: Desk corner, near the book stack

### 31. Water Bottle — `props/water-bottle.glb`

- **Dimensions**: ~0.04 diameter × 0.12 tall
- **Tris**: ~50–80
- **Materials**: Semi-transparent body (opacity 0.6, color `#89dceb`), dark cap (`#313244`)
- **Mesh names**: `body`, `cap`
- **Placement**: Desk edge, near the mouse

### 32. Rubber Duck — `props/rubber-duck.glb`

- **Dimensions**: ~0.05 × 0.05 × 0.05
- **Tris**: ~100–150
- **Materials**: Classic yellow (`#f9e2af`), orange beak (`#fab387`), dark eyes
- **Mesh names**: `body`, `beak`, `eye_l`, `eye_r`
- **Placement**: On desk next to keyboard. Easter egg debugging companion

---

## Category 5: Office Environment

Larger set-dressing pieces that populate the office background.

### 33. Whiteboard — `office/whiteboard.glb`

- **Dimensions**: ~3.0 × 2.0 × 0.1 units
- **Tris**: ~50–100
- **Materials**: White board face (`#cdd6f4`, roughness 0.3), dark metal frame (`#45475a`), optional marker tray at the bottom
- **Mesh names**: `frame`, `board_face`, `tray`
- **Details**: Optional scribbled diagram/text baked into the board face texture
- **Placement**: Mounted on the back wall at Y=1.5 (center height)

### 34. Server Rack — `office/server-rack.glb`

- **Dimensions**: ~0.6 × 1.8 × 0.6 units
- **Tris**: ~300–500
- **Materials**: Dark metal body (`#313244`, metalness 0.3). Small emissive LED dots on the front face (green `#a6e3a1`, blue `#89b4fa`)
- **Mesh names**: `cabinet`, `door`, `led_1`…`led_6` (emissive)
- **Details**: 2–3 rack unit slots visible through mesh or perforated front. 4–6 tiny LED dots for blinking animation
- **Placement**: Corner of the room, against a wall

### 35. Water Cooler — `office/water-cooler.glb`

- **Dimensions**: ~0.3 × 1.1 × 0.3 units
- **Tris**: ~150–250
- **Materials**: Blue-tinted water jug on top (translucent, opacity 0.3, `#89b4fa`). Grey/white dispenser body (`#585b70`)
- **Mesh names**: `jug`, `dispenser`, `spigot`, `drip_tray`
- **Placement**: Near a wall, accessible walkway area between desk clusters

### 36. Couch — `office/couch.glb`

- **Dimensions**: ~1.8 × 0.7 × 0.8 units (2-seater)
- **Tris**: ~300–500
- **Materials**: Dark fabric (`#313244`, roughness 0.9). Subtle blocky cushion shapes
- **Mesh names**: `frame`, `cushion_l`, `cushion_r`, `backrest`, `armrest_l`, `armrest_r`
- **Placement**: Corner break area, angled or against a wall

### 37. Coffee Table — `office/coffee-table.glb`

- **Dimensions**: ~0.8 × 0.4 × 0.4 units (low table)
- **Tris**: ~50–100
- **Materials**: Dark wood (`#45475a`, roughness 0.7)
- **Mesh names**: `top`, `leg_1`…`leg_4`
- **Placement**: In front of the couch in the break area

### 38. Trash Bin — `office/trash-bin.glb`

- **Dimensions**: ~0.2 × 0.3 × 0.2 units
- **Tris**: ~50–80
- **Materials**: Dark matte (`#313244`, roughness 0.8)
- **Mesh names**: `bin`
- **Placement**: Next to desks, one per 2–3 desk cluster

### 39. Filing Cabinet — `office/filing-cabinet.glb`

- **Dimensions**: ~0.4 × 1.0 × 0.5 units (2–3 drawer)
- **Tris**: ~100–200
- **Materials**: Dark metal (`#45475a`, metalness 0.3). Drawer handles slightly lighter
- **Mesh names**: `body`, `drawer_1`, `drawer_2`, `drawer_3`, `handle_1`, `handle_2`, `handle_3`
- **Placement**: Between or behind desk clusters

### 40. Partition — `office/partition.glb`

- **Dimensions**: ~2.5 × 1.5 × 0.08 units (single panel section)
- **Tris**: ~50–100
- **Materials**: Fabric panel (`#45475a`, roughness 0.95) on thin metal frame (`#313244`)
- **Mesh names**: `frame`, `panel`
- **Placement**: Between rows of desks to create cubicle-like zones. Can be instanced/repeated

### 41. Wall Clock — `office/wall-clock.glb`

- **Dimensions**: ~0.3 diameter × 0.04 deep
- **Tris**: ~80–120
- **Materials**: Dark frame (`#313244`), white face. Hour/minute hands as separate meshes (can be rotated at runtime to show real time)
- **Mesh names**: `frame`, `face`, `hand_hour`, `hand_minute`
- **Placement**: Mounted on wall at Y=2.5

### 42. Wall Art — `office/wall-art.glb`

- **Dimensions**: ~0.8 × 0.6 × 0.04 units (framed)
- **Tris**: ~20–40
- **Materials**: Dark frame (`#313244`), art face can use a simple gradient or abstract color texture
- **Mesh names**: `frame`, `canvas`
- **Placement**: Mounted on walls, 1–2 pieces for decoration

### 43. Area Rug — `office/area-rug.glb`

- **Dimensions**: ~3.0 × 2.0 × 0.02 units
- **Tris**: ~4–10 (flat quad)
- **Materials**: Subtle color (`#313244` with slight pattern in texture), roughness 0.95
- **Mesh names**: `rug`
- **Placement**: Under the break area (couch + coffee table), slightly above floor (Y=0.01)

---

## Category 6: Particle/Sprite Effects (code-only, no models)

These are implemented in code, not as model files:

| # | Effect | Implementation |
|---|--------|----------------|
| 1 | **Steam from Mug** | 2–3 small translucent sprites rising + fading from mug position. `SpriteMaterial` with opacity animation |
| 2 | **Monitor Glow** | Soft `PointLight` per monitor, color-tinted to match process type. Low intensity (0.2–0.3) |
| 3 | **Server Rack LEDs** | Toggle emissive on/off for LED meshes at random intervals (~1–3s) |
| 4 | **Ambient Dust Particles** | `Points` geometry with ~50–100 tiny particles floating slowly, lit by scene lights |

---

## Scene Layout Reference

```
         BACK WALL (with whiteboard, clock, art)
    ┌──────────────────────────────────────────────┐
    │  [server]                          [cooler]  │
    │                                              │
W   │   [desk0]  [desk1]  [desk2]  [desk3]        │  W
I   │              ─── partition ───               │  A
N   │   [desk4]  [desk5]  [desk6]  [desk7]        │  L
D   │              ─── partition ───               │  L
O   │   [desk8]  [desk9]  [desk10] [desk11]       │
W   │                                              │
S   │  ┌─────────────────┐  [cabinet] [cabinet]   │
    │  │ [couch]          │                        │
    │  │ [coffee table]   │  [bin]                 │
    │  │     [rug]        │                        │
    │  └─────────────────┘                         │
    └──────────────────────────────────────────────┘
              OPEN FRONT (camera faces in)

    Desk spacing: 5 units apart, 4 per row
    Camera default: position (10, 14, 16), looking at center
```

---

## Priority Order

Start with these — they replace the current box primitives and have the biggest visual impact:

1. **`base-character.glb`** — the core character model with animation clips
2. **`desk.glb`** — replaces box geometry desk
3. **`chair.glb`** — replaces box geometry chair
4. **`monitor.glb`** — replaces box geometry monitor (keep `screen_face` for CanvasTexture)
5. **`keyboard.glb`** — replaces box geometry keyboard
6. **`floor.glb`** — better textured floor
7. **Hats** — one at a time per process type
8. **Desk props** (mug, plant, duck) — adds life
9. **Office furniture** (whiteboard, server rack, partitions) — fills out the space
10. **Environment** (walls, windows, ceiling lights) — completes the room
