"""Original CORE Sorter 01 concept geometry. No manufacturer CAD or measured hardware.
Run with Blender: blender --background --factory-startup --python this_file -- output.glb
"""
import bpy, math, sys, os
from mathutils import Vector
from collections import defaultdict

bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for block in list(bpy.data.materials): bpy.data.materials.remove(block)

def mat(name, color, metallic=0, roughness=.3, coat=0):
    m=bpy.data.materials.new(name); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Metallic'].default_value=metallic; p.inputs['Roughness'].default_value=roughness
    p.inputs['Coat Weight'].default_value=coat; p.inputs['Coat Roughness'].default_value=.2
    return m
white=mat('Ceramic-coated cast aluminium',(.77,.81,.85),.12,.27,.3)
edge=mat('Satin anodised aluminium',(.34,.40,.47),.9,.28)
steel=mat('Brushed stainless steel',(.58,.63,.69),1,.24)
black=mat('Graphite joint housing',(.027,.038,.052),.65,.33)
rubber=mat('Elastomer cable and grip',(.012,.018,.024),.05,.53)
blue=mat('CORE blue / restrained detail',(.006,.15,.52),.5,.23,.25)
traymat=mat('Formed polymer trays',(.63,.69,.75),.02,.42)
bench=mat('Precision work surface',(.52,.57,.62),.8,.36)
letter=mat('Laser etched markings',(.065,.09,.12),.3,.5)
glass=mat('Optical lens',(.01,.035,.045),.8,.08,.6)

root=bpy.data.objects.new('sorter_concept',None); bpy.context.collection.objects.link(root)
root['classification']='Explanatory concept / not a physical simulation'
root['link_lengths_m']=[.38,.395]; root['tool_offset_m']=.177

def empty(name,parent=root,pos=(0,0,0)):
    o=bpy.data.objects.new(name,None); bpy.context.collection.objects.link(o); o.parent=parent; o.location=pos; return o

def finish(o,name,parent,material,pos,rot=(0,0,0),bevel=0,smooth=True):
    o.name=name; o.data.materials.append(material)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Manufactured edge radius','BEVEL'); mod.width=bevel; mod.segments=3
        mod.affect='EDGES'
        bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=mod.name)
    for p in o.data.polygons:p.use_smooth=smooth
    if bevel:
        mod=o.modifiers.new('Area weighted corner normals','WEIGHTED_NORMAL');mod.keep_sharp=True;mod.weight=50
        try:bpy.ops.object.modifier_apply(modifier=mod.name)
        except RuntimeError:pass
    o.parent=parent;o.location=pos;o.rotation_euler=rot;return o

def box(name,size,pos,material=white,parent=root,r=.004):
    bpy.ops.mesh.primitive_cube_add(size=1);o=bpy.context.object;o.dimensions=size
    return finish(o,name,parent,material,pos,bevel=r,smooth=False)

def cyl(name,r,h,pos,material=steel,parent=root,axis='Z',vertices=64,bevel=.0015):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=h)
    rot=(math.pi/2,0,0) if axis=='Y' else ((0,math.pi/2,0) if axis=='X' else (0,0,0))
    return finish(bpy.context.object,name,parent,material,pos,rot,bevel)

def torus(name,major,minor,pos,material=black,parent=root,axis='Z'):
    bpy.ops.mesh.primitive_torus_add(major_segments=64,minor_segments=8,major_radius=major,minor_radius=minor)
    rot=(math.pi/2,0,0) if axis=='Y' else (0,0,0)
    return finish(bpy.context.object,name,parent,material,pos,rot)

def tube(name,points,r,material=rubber,parent=root):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=16;c.bevel_depth=r;c.bevel_resolution=3
    s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
    for p,co in zip(s.bezier_points,points):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(material);o.parent=parent
    bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False);return o

def label(text,pos,size,parent=root,rot=(0,0,0),material=letter):
    c=bpy.data.curves.new('Marking '+text,'FONT');c.body=text;c.align_x='CENTER';c.size=size;c.extrude=.00003;c.space_character=1.1
    o=bpy.data.objects.new('Marking '+text,c);bpy.context.collection.objects.link(o);o.parent=parent;o.location=pos;o.rotation_euler=rot;c.materials.append(material)
    bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)

def bolt(name,pos,parent=root,axis='Z',scale=1):
    g=empty(name,parent,pos)
    if axis=='Y':g.rotation_euler.x=math.pi/2
    cyl('Seat washer',.0058*scale,.0012*scale,(0,0,0),edge,g,bevel=.0003)
    cyl('Socket cap',.0045*scale,.004*scale,(0,0,.002*scale),steel,g,vertices=32,bevel=.0007)
    cyl('Recessed hex socket',.0021*scale,.0003*scale,(0,0,.0041*scale),rubber,g,vertices=6,bevel=.00005)
    return g

def shell(name,sections,parent,material=white):
    n=48;verts=[]
    for z,w,d in sections:
        for i in range(n):
            a=2*math.pi*i/n;co,si=math.cos(a),math.sin(a)
            verts.append((math.copysign(abs(co)**.62,co)*w/2,math.copysign(abs(si)**.62,si)*d/2,z))
    faces=[]
    for j in range(len(sections)-1):
        for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
    faces+=[tuple(reversed(range(n))),tuple((len(sections)-1)*n+i for i in range(n))]
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.parent=parent;mesh.materials.append(material)
    for p in mesh.polygons:p.use_smooth=p.index<len(faces)-2
    return o

def bearing(parent,r,depth,name):
    cyl(name+' cast hub',r,depth,(0,0,0),white,parent,'Y',bevel=.004)
    for s in [-1,1]:
        y=s*(depth/2+.001)
        cyl(name+' bearing seat',r*.91,.006,(0,y,0),edge,parent,'Y',bevel=.001)
        cyl(name+' motor cover',r*.79,.008,(0,y+s*.004,0),black,parent,'Y',bevel=.002)
        torus(name+' machined rim',r*.82,.0016,(0,y+s*.009,0),steel,parent,'Y')
        cyl(name+' axial cap',r*.30,.008,(0,y+s*.009,0),white,parent,'Y',bevel=.002)
        if s<0:
            for i in range(6):
                a=i*math.tau/6
                bolt(name+' cover screw',(r*.62*math.cos(a),y-.010,r*.62*math.sin(a)),parent,'Y',.65)

# Fixture plate: a layered precision surface, no toy table legs.
box('Worktop / radiused aluminium', (1.48,.88,.035),(0,0,-.024),bench,r=.012)
box('Anodised edge rail',(1.49,.89,.032),(0,0,-.056),black,r=.012)
box('Lower chassis',(1.40,.80,.048),(0,0,-.095),white,r=.012)
for x in [-.61,.61]:
 for y in [-.32,.32]:cyl('Isolation foot',.037,.025,(x,y,-.131),rubber,bevel=.005)
# Flat counterbores / sockets: restrained manufacturing detail.
for ix in range(-10,11):
 for iy in range(-5,6):
  x=ix*.06;y=iy*.06
  if (-.15<x<.15 and .06<y<.30):continue
  cyl('Fixture counterbore',.0024,.0004,(x,y,-.0058),black,vertices=12,bevel=0)
label('CORE  /  SORTER 01',(0,-.446,-.054),.016,rot=(math.pi/2,0,0),material=white)
label('R&D CONCEPT',(.49,-.446,-.061),.008,rot=(math.pi/2,0,0),material=steel)

# Custom six-axis concept manipulator, with separate kinematic frames.
base=empty('base_fixed',pos=(0,.18,0))
cyl('Anchoring flange',.119,.020,(0,0,.004),edge,base,bevel=.003)
for i in range(8):
 a=math.tau*i/8;bolt('Base anchor',(.103*math.cos(a),.103*math.sin(a),.016),base,scale=1.15)
cyl('Lower base gasket',.092,.010,(0,0,.020),rubber,base)
cyl('Base cast housing',.087,.075,(0,0,.060),white,base,bevel=.012)
cyl('Base separation line',.084,.005,(0,0,.099),rubber,base,bevel=.001)
yaw=empty('joint_base',base,(0,0,.103))
cyl('Turntable collar',.083,.022,(0,0,.009),steel,yaw,bevel=.003)
cyl('Turntable cast shoulder riser',.077,.071,(0,0,.047),white,yaw,bevel=.010)
torus('Blue index ring',.077,.0018,(0,0,.023),blue,yaw)
box('Connector panel',(.077,.011,.034),(0,.074,.052),black,yaw,r=.004)
for x in [-.024,0,.024]:
 cyl('Sealed connector',.007,.007,(x,.084,.052),edge,yaw,'Y',bevel=.0007)
# J2 originates 0.22m above the work plane.
shoulder=empty('joint_shoulder',yaw,(0,0,.117));bearing(shoulder,.071,.158,'Shoulder')
# The shells are lofted cast forms, with an inset access cover and true radiused transitions.
shell('Upper arm casting',[(.025,.100,.120),(.055,.116,.118),(.105,.101,.102),(.265,.080,.092),(.328,.096,.107),(.355,.102,.115)],shoulder)
box('Upper access cover',(.058,.005,.182),(0,-.051,.192),white,shoulder,r=.009)
box('Upper access cover seam',(.063,.003,.187),(0,-.050,.192),rubber,shoulder,r=.010)
box('Upper access cover face',(.058,.004,.181),(0,-.053,.192),white,shoulder,r=.009)
for z in [.115,.268]:
 for x in [-.019,.019]:bolt('Upper cover fastener',(x,-.057,z),shoulder,'Y',.5)
label('CORE', (0,-.057,.212),.014,shoulder,(math.pi/2,0,0))
label('SORTER  /  01',(0,-.057,.188),.006,shoulder,(math.pi/2,0,0))
tube('Upper cable sheath',[(-.063,.025,.04),(-.077,.031,.12),(-.064,.035,.29),(-.05,.025,.35)],.007,rubber,shoulder)
for z in [.10,.29]:box('Cable clamp',(.019,.018,.018),(-.067,.035,z),black,shoulder,r=.003)
elbow=empty('joint_elbow',shoulder,(0,0,.38));bearing(elbow,.061,.138,'Elbow')
shell('Forearm casting',[(.023,.092,.100),(.055,.102,.098),(.105,.077,.082),(.255,.061,.069),(.300,.073,.080),(.322,.076,.083)],elbow)
box('Forearm inset spine',(.028,.004,.184),(0,.040,.167),black,elbow,r=.008)
box('Forearm brushed inset',(.025,.004,.164),(0,-.042,.175),edge,elbow,r=.006)
for z in [.10,.25]:bolt('Forearm plate screw',(0,-.047,z),elbow,'Y',.55)
tube('Forearm control harness',[(-.044,.035,.01),(-.058,.041,.07),(-.045,.042,.24),(-.035,.02,.32)],.0055,rubber,elbow)
roll=empty('joint_wrist_roll',elbow,(0,0,.34))
cyl('Wrist roll bearing',.044,.026,(0,0,.006),steel,roll,bevel=.003)
cyl('Wrist roll motor',.039,.034,(0,0,.035),black,roll,bevel=.003)
pitch=empty('joint_wrist_pitch',roll,(0,0,.055));bearing(pitch,.038,.087,'Wrist')
# J6 roll + industrial parallel gripper.
tool=empty('joint_tool',pitch,(0,0,.042))
cyl('Tool flange',.033,.011,(0,0,0),steel,tool,bevel=.001)
for i in range(6):
 a=i*math.tau/6;bolt('Tool mounting screw',(.026*math.cos(a),.026*math.sin(a),.006),tool,scale=.45)
box('Gripper housing',(.071,.048,.044),(0,0,.031),edge,tool,r=.006)
box('Gripper end plate',(.074,.051,.006),(0,0,.056),steel,tool,r=.003)
for x in [-.025,.025]:
 for y in [-.016,.016]:bolt('Gripper cover screw',(x,y,.060),tool,scale=.45)
for y in [-.012,.012]:cyl('Gripper linear guide',.003,.075,(0,y,.067),steel,tool,'X',bevel=.0007)
left=empty('finger_left',tool,(-.034,0,.068));right=empty('finger_right',tool,(.034,0,.068))
for s,g in [(-1,left),(1,right)]:
 box('Jaw carriage',(.019,.042,.014),(0,0,0),black,g,r=.002)
 box('Precision jaw',(.011,.025,.073),(0,0,.044),steel,g,r=.002)
 box('Replaceable gripping pad',(.004,.022,.028),(-s*.0065,0,.063),rubber,g,r=.001)
 for z in [.025,.063]:bolt('Finger screw',(0,-.014,z),g,'Y',.35)
empty('tcp',tool,(0,0,.135))
# Flexible lines terminate at the tool instead of floating decorative wires.
tube('Wrist service loop',[(.015,.036,.008),(.057,.046,.035),(.068,.035,.078),(.044,.025,.09)],.0035,rubber,tool)

# Die-formed trays with radiused walls and a continuous floor.
def tray(name,x,y):
 g=empty(name,pos=(x,y,0))
 box('Tray floor',(.258,.235,.006),(0,0,.004),traymat,g,r=.009)
 for s in [-1,1]:
  box('Tray rim long',(.266,.009,.036),(0,s*.116,.020),traymat,g,r=.004)
  box('Tray rim short',(.009,.228,.036),(s*.129,0,.020),traymat,g,r=.004)
  box('Tray stacking detail',(.016,.022,.015),(s*.119,-.099,.039),white,g,r=.003)
 return g
input_tray=tray('input_tray',-.445,-.235);tray('output_tray',.445,-.235);tray('review_tray',.445,.12)
label('01  /  INPUT',(-.445,-.382,-.004),.011)
label('02  /  SORT',(.445,-.382,-.004),.011)
label('03  /  REVIEW',(.445,.267,-.004),.011)
# Machined components have a bore, a flange and visible edges (not coloured cubes).
def part(name,parent,pos,material=steel):
 g=empty(name,parent,pos)
 torus('Machined annular body',.021,.007,(0,0,.010),material,g)
 torus('Machined upper lip',.021,.002,(0,0,.016),edge,g)
 return g
part('workpiece_carried',root,(-.445,-.235,.010))
for x,y in [(-.51,-.29),(-.38,-.29),(-.51,-.18),(-.38,-.18)]:part('Input component',root,(x,y,.010))
part('Sorted component',root,(.48,-.26,.010));part('Review component',root,(.43,.11,.010),black)

# One precision extrusion camera mast, without a visually dominant cage.
def extrusion(name,length,pos):
 g=empty(name,pos=pos)
 box('40mm profile',(.038,.038,length),(0,0,0),edge,g,r=.0015)
 for s in [-1,1]:
  box('T-slot channel',(.011,.0015,length-.003),(0,s*.0194,0),rubber,g,r=.0003)
  box('T-slot channel',(.0015,.011,length-.003),(s*.0194,0,0),rubber,g,r=.0003)
 return g
camera_group=empty('camera_stage')
previous_objects=set(bpy.context.scene.objects)
extrusion('Camera support',.66,(-.63,.27,.33))
box('Mast foot',(.095,.09,.016),(-.63,.27,.004),steel,r=.004)
for x in [-.663,-.597]:
 for y in [.242,.298]:bolt('Mast foot anchor',(x,y,.016))
box('Camera cantilever',(.039,.43,.035),(-.63,.072,.65),edge,r=.002)
box('Camera mounting plate',(.080,.075,.007),(-.63,-.105,.631),steel,r=.002)
box('Vision camera housing',(.075,.068,.044),(-.63,-.105,.605),black,r=.005)
cyl('Vision lens barrel',.023,.028,(-.63,-.105,.571),black,bevel=.001)
for z in [.565,.574]:torus('Lens knurled ring',.023,.0012,(-.63,-.105,z),edge)
cyl('Optical element',.018,.002,(-.63,-.105,.556),glass,bevel=.0005)
box('Camera connection socket',(.026,.025,.020),(-.602,-.105,.608),edge,r=.003)
tube('Camera data cable',[(-.60,-.10,.62),(-.60,.12,.675),(-.63,.27,.63),(-.65,.29,.10)],.004,rubber)

bpy.context.view_layer.update()
for o in list(bpy.context.scene.objects):
 if o not in previous_objects and o.parent==root:
  world=o.matrix_world.copy();o.parent=camera_group;o.matrix_world=world

# Flatten each rigid subassembly by material, preserving the joint hierarchy.
bpy.context.view_layer.update()
for o in bpy.context.scene.objects:o.select_set(False)
groups=defaultdict(list)
for o in list(bpy.context.scene.objects):
 if o.type=='MESH':
  # Move small fastener meshes from their assembly empties to their nearest joint/static ancestor.
  parent=o.parent
  while parent and parent.name not in ['camera_stage','sorter_concept','base_fixed','joint_base','joint_shoulder','joint_elbow','joint_wrist_roll','joint_wrist_pitch','joint_tool','finger_left','finger_right','workpiece_carried']:
   parent=parent.parent
  if parent is None:parent=root
  world=o.matrix_world.copy();o.parent=parent;o.matrix_world=world
  groups[(parent.name,o.data.materials[0].name)].append(o)
for (parentname,matname),objects in groups.items():
 if len(objects)>1:
  for o in objects:o.select_set(True)
  bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();objects[0].name=parentname+' / '+matname
  objects[0].select_set(False)
# Remove empty wrappers except the rig and TCP.
for o in list(bpy.context.scene.objects):
 if o.type=='EMPTY' and not o.children and o.name!='tcp':bpy.data.objects.remove(o,do_unlink=True)

# A plausible product pose, expressed in the documented 2-link explanatory rig.
def pose(tip=(.35,-.22,.16)):
 x,y,z=tip;dx=x;dy=y-.18;r=math.hypot(dx,dy);d=z+.177-.22
 c=max(-1,min(1,(r*r+d*d-.38*.38-.395*.395)/(2*.38*.395)))
 t2=-math.acos(c);t1=math.atan2(d,r)-math.atan2(.395*math.sin(t2),.38+.395*math.cos(t2))
 q1=math.pi/2-t1;q2=-t2
 yaw.rotation_euler.z=math.atan2(dy,dx);shoulder.rotation_euler.y=q1;elbow.rotation_euler.y=q2
 pitch.rotation_euler.y=math.pi-q1-q2
pose()
bpy.context.view_layer.update()
argv=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
output=os.path.abspath(argv[0] if argv else 'public/corp/robots/sorter-01-v2.glb')
os.makedirs(os.path.dirname(output),exist_ok=True)
if len(argv)>1:
 blendfile=os.path.abspath(argv[1])
 os.makedirs(os.path.dirname(blendfile),exist_ok=True)
 bpy.ops.wm.save_as_mainfile(filepath=blendfile)
bpy.ops.export_scene.gltf(filepath=output,export_format='GLB',export_yup=True,export_extras=True,export_animations=False,export_cameras=False,export_lights=False,export_apply=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6,export_draco_position_quantization=14,export_draco_normal_quantization=10)
print('CORE_ASSET',output,'bytes',os.path.getsize(output),'meshes',sum(o.type=='MESH' for o in bpy.context.scene.objects))
