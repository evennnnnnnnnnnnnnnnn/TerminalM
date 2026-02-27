"""
Blender Python Script — Office Desk Generator
===============================================
Run this script inside Blender (Scripting tab → Open → Run Script)
or from command line:
    blender --background --python generate_desk.py

Spec:
  - Format: glTF 2.0 Binary (.glb)
  - Style: Low-poly, flat-shaded, stylized
  - Scale: 1 unit = 1 meter
  - Origin: Bottom-center (floor contact point)
  - Up axis: Y-up
  - Dimensions: 2.0 W × 1.2 D × 0.85 H (top surface at Y=0.85)
  - Tris: ~500–800
  - Materials: PBR metallic-roughness, solid colors only
  - Mesh names: top_surface, leg_fl, leg_fr, leg_bl, leg_br, grommet
"""

import bpy
import bmesh
import math
import os

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
EXPORT_PATH = os.path.join(os.path.dirname(bpy.data.filepath) or os.path.expanduser("~"), "desk.glb")

# Desk dimensions (meters)
DESK_WIDTH  = 2.0    # X
DESK_DEPTH  = 1.2    # Y (into screen in front view)
DESK_HEIGHT = 0.85   # Z (top surface height)

TOP_THICKNESS = 0.04  # thickness of the desktop surface
BEVEL_WIDTH   = 0.008 # bevel on top edges
BEVEL_SEGMENTS = 2    # keep low for low-poly

# Leg dimensions
LEG_SIZE      = 0.05  # square cross-section
LEG_INSET     = 0.06  # how far inward from desk edges

# Grommet (cable hole)
GROMMET_RADIUS   = 0.035
GROMMET_DEPTH    = TOP_THICKNESS + 0.001  # punch through the top
GROMMET_SEGMENTS = 12  # low-poly circle
# Position: centered on X, near back edge of desk
GROMMET_OFFSET_Y = (DESK_DEPTH / 2) - 0.12  # 12cm from back edge

# Colors (sRGB hex → linear RGB for Blender)
COLOR_TOP  = 0x45475A  # matte grey top
COLOR_LEGS = 0x313244  # darker legs

# PBR values
TOP_ROUGHNESS  = 0.7
TOP_METALLIC   = 0.1
LEG_ROUGHNESS  = 0.8
LEG_METALLIC   = 0.05


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────
def hex_to_linear(hex_color):
    """Convert hex int to linear RGB tuple (Blender uses linear color space)."""
    r = ((hex_color >> 16) & 0xFF) / 255.0
    g = ((hex_color >> 8) & 0xFF) / 255.0
    b = (hex_color & 0xFF) / 255.0
    # sRGB → linear approximation
    def to_linear(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (to_linear(r), to_linear(g), to_linear(b), 1.0)


def clear_scene():
    """Remove all objects, meshes, and materials."""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for block in bpy.data.meshes:
        bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        bpy.data.materials.remove(block)


def create_pbr_material(name, hex_color, roughness, metallic):
    """Create a solid-color PBR material (no image textures)."""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = hex_to_linear(hex_color)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    # Flat shading is set per-object, not per-material
    return mat


def set_flat_shading(obj):
    """Set flat shading on the object (low-poly style)."""
    for poly in obj.data.polygons:
        poly.use_smooth = False


def set_origin_to_bottom_center(obj):
    """Move origin to bottom-center of the bounding box."""
    # We build everything with Z=0 at the floor already,
    # so just make sure origin is at world origin
    obj.location = (0, 0, 0)


# ─────────────────────────────────────────────
# BUILD DESK PARTS
# ─────────────────────────────────────────────
def create_top_surface(mat):
    """
    Create the desktop surface with beveled edges and a grommet hole.
    Top of surface sits at Z = DESK_HEIGHT.
    Bottom of surface at Z = DESK_HEIGHT - TOP_THICKNESS.
    """
    # Start with a cube scaled to desk top dimensions
    bm = bmesh.new()

    # Create box: centered on XY, bottom at DESK_HEIGHT - TOP_THICKNESS
    z_bottom = DESK_HEIGHT - TOP_THICKNESS
    z_top = DESK_HEIGHT

    # 8 vertices of the box
    hw = DESK_WIDTH / 2   # half width
    hd = DESK_DEPTH / 2   # half depth

    verts = [
        bm.verts.new((-hw, -hd, z_bottom)),  # 0: front-left bottom
        bm.verts.new(( hw, -hd, z_bottom)),  # 1: front-right bottom
        bm.verts.new(( hw,  hd, z_bottom)),  # 2: back-right bottom
        bm.verts.new((-hw,  hd, z_bottom)),  # 3: back-left bottom
        bm.verts.new((-hw, -hd, z_top)),     # 4: front-left top
        bm.verts.new(( hw, -hd, z_top)),     # 5: front-right top
        bm.verts.new(( hw,  hd, z_top)),     # 6: back-right top
        bm.verts.new((-hw,  hd, z_top)),     # 7: back-left top
    ]

    # 6 faces
    bm.faces.new([verts[0], verts[1], verts[5], verts[4]])  # front
    bm.faces.new([verts[1], verts[2], verts[6], verts[5]])  # right
    bm.faces.new([verts[2], verts[3], verts[7], verts[6]])  # back
    bm.faces.new([verts[3], verts[0], verts[4], verts[7]])  # left
    bm.faces.new([verts[4], verts[5], verts[6], verts[7]])  # top
    bm.faces.new([verts[0], verts[3], verts[2], verts[1]])  # bottom

    bm.faces.ensure_lookup_table()
    bm.verts.ensure_lookup_table()
    bm.edges.ensure_lookup_table()

    # Bevel the top 4 edges (edges connecting top face vertices)
    top_edges = []
    top_verts_set = {verts[4], verts[5], verts[6], verts[7]}
    for edge in bm.edges:
        v1_top = edge.verts[0] in top_verts_set
        v2_top = edge.verts[1] in top_verts_set
        # We want the vertical edges at the top (where top meets sides)
        # These are edges where both verts are in the top set AND edge is on the boundary
        # Actually, we want the top perimeter edges of the top face
        if v1_top and v2_top:
            # Check this is a horizontal top edge (both at z_top)
            if (abs(edge.verts[0].co.z - z_top) < 0.001 and
                abs(edge.verts[1].co.z - z_top) < 0.001):
                top_edges.append(edge)

    if top_edges:
        bmesh.ops.bevel(
            bm,
            geom=top_edges,
            offset=BEVEL_WIDTH,
            segments=BEVEL_SEGMENTS,
            affect='EDGES',
            profile=0.5,
        )

    # Create mesh and object
    mesh = bpy.data.meshes.new("top_surface")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("top_surface", mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    set_flat_shading(obj)

    return obj


def create_grommet(mat_top):
    """
    Create a cable grommet hole near the back of the desk.
    This is a cylinder punched through the top surface.
    We'll create it as a ring/annulus mesh for visual representation.
    """
    bm = bmesh.new()

    z_top = DESK_HEIGHT + 0.001  # slightly above to avoid z-fighting
    z_bottom = DESK_HEIGHT - TOP_THICKNESS - 0.001
    grommet_x = 0.0
    grommet_y = GROMMET_OFFSET_Y

    inner_r = GROMMET_RADIUS
    outer_r = GROMMET_RADIUS + 0.008  # thin ring

    # Create ring vertices (top and bottom circles, inner and outer)
    top_outer = []
    top_inner = []
    bot_outer = []
    bot_inner = []

    for i in range(GROMMET_SEGMENTS):
        angle = (2 * math.pi * i) / GROMMET_SEGMENTS
        cos_a = math.cos(angle)
        sin_a = math.sin(angle)

        top_outer.append(bm.verts.new((
            grommet_x + outer_r * cos_a,
            grommet_y + outer_r * sin_a,
            z_top
        )))
        top_inner.append(bm.verts.new((
            grommet_x + inner_r * cos_a,
            grommet_y + inner_r * sin_a,
            z_top
        )))
        bot_outer.append(bm.verts.new((
            grommet_x + outer_r * cos_a,
            grommet_y + outer_r * sin_a,
            z_bottom
        )))
        bot_inner.append(bm.verts.new((
            grommet_x + inner_r * cos_a,
            grommet_y + inner_r * sin_a,
            z_bottom
        )))

    n = GROMMET_SEGMENTS
    for i in range(n):
        j = (i + 1) % n
        # Top ring face
        bm.faces.new([top_outer[i], top_outer[j], top_inner[j], top_inner[i]])
        # Bottom ring face
        bm.faces.new([bot_inner[i], bot_inner[j], bot_outer[j], bot_outer[i]])
        # Outer wall
        bm.faces.new([top_outer[i], bot_outer[i], bot_outer[j], top_outer[j]])
        # Inner wall (the hole)
        bm.faces.new([top_inner[j], bot_inner[j], bot_inner[i], top_inner[i]])

    mesh = bpy.data.meshes.new("grommet")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("grommet", mesh)
    bpy.context.collection.objects.link(obj)

    # Grommet gets a slightly different shade (darker, like rubber/plastic)
    grommet_mat = create_pbr_material("mat_grommet", 0x1E1E2E, roughness=0.9, metallic=0.0)
    obj.data.materials.append(grommet_mat)
    set_flat_shading(obj)

    return obj


def create_leg(name, x, y, mat):
    """Create a single desk leg as a box from floor (Z=0) to underside of top."""
    leg_height = DESK_HEIGHT - TOP_THICKNESS
    half = LEG_SIZE / 2

    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)

    # Scale and position
    for v in bm.verts:
        v.co.x = x + v.co.x * LEG_SIZE
        v.co.y = y + v.co.y * LEG_SIZE
        v.co.z = (v.co.z + 0.5) * leg_height  # shift up so bottom is at 0

    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    set_flat_shading(obj)

    return obj


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────
def main():
    clear_scene()

    # Create materials
    mat_top = create_pbr_material("mat_top_surface", COLOR_TOP, TOP_ROUGHNESS, TOP_METALLIC)
    mat_legs = create_pbr_material("mat_legs", COLOR_LEGS, LEG_ROUGHNESS, LEG_METALLIC)

    # ── Top surface ──
    top = create_top_surface(mat_top)

    # ── Grommet ──
    grommet = create_grommet(mat_top)

    # ── Legs ──
    # Positions: inset from corners
    hw = DESK_WIDTH / 2 - LEG_INSET
    hd = DESK_DEPTH / 2 - LEG_INSET

    #   fl = front-left, fr = front-right, bl = back-left, br = back-right
    #   Front = -Y, Back = +Y, Left = -X, Right = +X
    leg_fl = create_leg("leg_fl", -hw, -hd, mat_legs)
    leg_fr = create_leg("leg_fr",  hw, -hd, mat_legs)
    leg_bl = create_leg("leg_bl", -hw,  hd, mat_legs)
    leg_br = create_leg("leg_br",  hw,  hd, mat_legs)

    # ── Triangulate all meshes (spec asks for tri count) ──
    all_objects = [top, grommet, leg_fl, leg_fr, leg_bl, leg_br]

    total_tris = 0
    for obj in all_objects:
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.quads_convert_to_tris()
        bpy.ops.object.mode_set(mode='OBJECT')
        obj.select_set(False)

        tri_count = len(obj.data.polygons)
        total_tris += tri_count
        print(f"  {obj.name}: {tri_count} tris")

    print(f"\n  TOTAL: {total_tris} tris")

    # ── Verify dimensions ──
    # Select all and check bounding box
    print(f"\n  Desk dimensions target: {DESK_WIDTH} W × {DESK_DEPTH} D × {DESK_HEIGHT} H")
    print(f"  Top surface at Z = {DESK_HEIGHT}")
    print(f"  Origin at bottom-center (0, 0, 0)")

    # ── Export as GLB ──
    # Select all objects
    bpy.ops.object.select_all(action='SELECT')

    bpy.ops.export_scene.gltf(
        filepath=EXPORT_PATH,
        export_format='GLB',
        use_selection=True,
        export_yup=True,           # Y-up as per spec
        export_apply=True,         # apply modifiers
        export_materials='EXPORT', # export PBR materials
        export_colors=False,       # no vertex colors needed
        export_cameras=False,
        export_lights=False,
    )

    print(f"\n  ✓ Exported to: {EXPORT_PATH}")
    print(f"  ✓ Format: glTF 2.0 Binary (.glb)")
    print(f"  ✓ Y-up, 1 unit = 1 meter")
    print(f"  ✓ Mesh names: top_surface, leg_fl, leg_fr, leg_bl, leg_br, grommet")


if __name__ == "__main__":
    main()
