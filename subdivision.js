/* CMPSCI 373 Homework 4: Subdivision Surfaces */

const panelSize = 600;
const fov = 35;
const aspect = 1;
let scene, renderer, camera, material, orbit, light, surface=null;
let nsubdiv = 0;

let coarseMesh = null;	// the original input triangle mesh
let currMesh = null;		// current triangle mesh

let flatShading = true;
let wireFrame = false;

let objStrings = [	
	box_obj,
	ico_obj,
	torus_obj,
	twist_obj,
	combo_obj,
	pawn_obj,
	bunny_obj,
	head_obj,
	hand_obj,
	klein_obj
];

let objNames = [
	'box',
	'ico',
	'torus',
	'twist',
	'combo',
	'pawn',
	'bunny',
	'head',
	'hand',
	'klein'
];

function id(s) {return document.getElementById(s);}
function message(s) {id('msg').innerHTML=s;}

function subdivide() {
	let currVerts = currMesh.vertices;
	let currFaces = currMesh.faces;
	let newVerts = [];
	let newFaces = [];
	/* You can access the current mesh data through
	 * currVerts and currFaces arrays.
	 * Compute one round of Loop's subdivision and
	 * output to newVerts and newFaces arrays.
	 */
	function calcNew(v0, v1, n0, n1){
			let x = 3/8 * v0.x + 3/8 * v1.x + 1/8 * n0.x + 1/8 * n1.x;
			let y = 3/8 * v0.y + 3/8 * v1.y + 1/8 * n0.y + 1/8 * n1.y;
			let z = 3/8 * v0.z + 3/8 * v1.z + 1/8 * n0.z + 1/8 * n1.z;
			return {x: x, y: y, z: z};
	}
	function adjHelp(i, arr, a, b, c){
		if(a === i && b !== i && !arr.includes(b)){
			arr.push(b);
			if(!arr.includes(c) && c !== i){
				arr.push(c);
			}
		}
	}
	
	let vertAdj = [];
	let edge = new Map();
	for(let i = 0; i < currVerts.length; i++){
		newVerts.push(currVerts[i].clone());
	}

	//set vertex adjancency data structure
	for(let i = 0; i < newVerts.length; i++){
		let arr = [];
		for(let j = 0; j < currFaces.length; j++){
			adjHelp(i,arr,currFaces[j].a,currFaces[j].b,currFaces[j].c);
			adjHelp(i,arr,currFaces[j].b,currFaces[j].a,currFaces[j].c);
			adjHelp(i,arr,currFaces[j].c,currFaces[j].b,currFaces[j].a);
		}
		vertAdj.push(arr);
	}	console.log(newVerts);

	//edge data struct
	let index = 0;
	for(let i = 0; i < currFaces.length; i++){
		function checkKey(x, y, z){
			let key = x < y ? x + "-" + y : y + "-" + x;
			let obj;

			if(!edge.has(key)){
				edge.set(key, {v0: x, v1: y, n0: z, index: currVerts.length + index});
				index++;
			}
			else{
				obj = edge.get(key);
				obj.n1 = z;
				obj.new = calcNew(currVerts[obj.v0], currVerts[obj.v1], currVerts[obj.n0], currVerts[obj.n1]);
			}
		}
		checkKey(currFaces[i].a, currFaces[i].b, currFaces[i].c);
		checkKey(currFaces[i].b, currFaces[i].c, currFaces[i].a);
		checkKey(currFaces[i].c, currFaces[i].a, currFaces[i].b);
	}

	//update old verts
	for(let i = 0; i < vertAdj.length; i++){
		let k = vertAdj[i].length;
		let b = 1/k * (5/8 - (3/8 + 1/4 * Math.cos(2*Math.PI/k)) * (3/8 + 1/4 * Math.cos(2*Math.PI/k)));
		let x = (1-k*b) * currVerts[i].x;
		let y = (1-k*b) * currVerts[i].y;
		let z = (1-k*b) * currVerts[i].z;
		for(let j = 0; j < vertAdj[i].length; j++){
			x += b * currVerts[vertAdj[i][j]].x;
			y += b * currVerts[vertAdj[i][j]].y;
			z += b * currVerts[vertAdj[i][j]].z;
		}
		let nVert = new THREE.Vector3(x, y, z);
		newVerts[i] = nVert;
	}
	
	//add new verts
	edge.forEach(function(val, key){
		let nVert = new THREE.Vector3(val.new.x, val.new.y, val.new.z);
		newVerts.push(nVert);
	})

	console.log(edge);
	//make new faces
	for(let i = 0; i < currFaces.length; i++){
		let mark = 0;
		function formKey(x,y){
			if (x < y){
				return x + "-" + y;
			}
			else{
				mark = 1;
				return y + "-" + x;
			}
		}
		function check(a, b){
			if (a.v0 === b.v1){
				return a.v0;
			}
			if (a.v0 === b.v0){
				return a.v0;
			}
			if (a.v1 == b.v0){
				return a.v1;
			}
			if (a.v1 == b.v1){
				return a.v1;
			}
		}
		let ab = edge.get(formKey(currFaces[i].a, currFaces[i].b));
		let bc = edge.get(formKey(currFaces[i].b, currFaces[i].c));
		let ca = edge.get(formKey(currFaces[i].c, currFaces[i].a));
		
		let a = new THREE.Face3(check(bc, ab), bc.index, ab.index);
		let b = new THREE.Face3(bc.index, check(bc, ca), ca.index);
		let c = new THREE.Face3(ca.index, check(ca, ab), ab.index);
		let d = new THREE.Face3(ab.index, bc.index, ca.index);
		newFaces.push(a);
		newFaces.push(b);
		newFaces.push(c);
		newFaces.push(d);
	}

	/* Overwrite current mesh with newVerts and newFaces */
	currMesh.vertices = newVerts;
	currMesh.faces = newFaces;
	/* Update mesh drawing */
	updateSurfaces();
}

window.onload = function(e) {
	// create scene, camera, renderer and orbit controls
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 100 );
	camera.position.set(-1, 1, 3);
	
	renderer = new THREE.WebGLRenderer({antialias: true});
	renderer.setSize(panelSize, panelSize);
	renderer.setClearColor(0x202020);
	id('surface').appendChild(renderer.domElement);	// bind renderer to HTML div element
	orbit = new THREE.OrbitControls(camera, renderer.domElement);
	
	light = new THREE.DirectionalLight(0xFFFFFF, 1.0);
	light.position.set(camera.position.x, camera.position.y, camera.position.z);	// right light
	scene.add(light);

	let amblight = new THREE.AmbientLight(0x202020);	// ambient light
	scene.add(amblight);
	
	// create materials
	material = new THREE.MeshPhongMaterial({color:0xCC8033, specular:0x101010, shininess: 50});
	
	// create current mesh object
	currMesh = new THREE.Geometry();
	
	// load first object
	loadOBJ(objStrings[0]);
}

function updateSurfaces() {
	currMesh.verticesNeedUpdate = true;
	currMesh.elementsNeedUpdate = true;
	currMesh.computeFaceNormals(); // compute face normals
	if(!flatShading) currMesh.computeVertexNormals(); // if smooth shading
	else currMesh.computeFlatVertexNormals(); // if flat shading
	
	if (surface!=null) {
		scene.remove(surface);	// remove old surface from scene
		surface.geometry.dispose();
		surface = null;
	}
	material.wireframe = wireFrame;
	surface = new THREE.Mesh(currMesh, material); // attach material to mesh
	scene.add(surface);
}

function loadOBJ(objstring) {
	loadOBJFromString(objstring, function(mesh) {
		coarseMesh = mesh;
		currMesh.vertices = mesh.vertices;
		currMesh.faces = mesh.faces;
		updateSurfaces();
		nsubdiv = 0;
	},
	function() {},
	function() {});
}

function onKeyDown(event) { // Key Press callback function
	switch(event.key) {
		case 'w':
		case 'W':
			wireFrame = !wireFrame;
			message(wireFrame ? 'wireframe rendering' : 'solid rendering');
			updateSurfaces();
			break;
		case 'f':
		case 'F':
			flatShading = !flatShading;
			message(flatShading ? 'flat shading' : 'smooth shading');
			updateSurfaces();
			break;
		case 's':
		case 'S':
		case ' ':
			if(nsubdiv>=5) {
				message('# subdivisions at maximum');
				break;
			}
			subdivide();
			nsubdiv++;
			updateSurfaces();
			message('# subdivisions = '+nsubdiv);
			break;
		case 'e':
		case 'E':
			currMesh.vertices = coarseMesh.vertices;
			currMesh.faces = coarseMesh.faces;
			nsubdiv = 0;
			updateSurfaces();
			message('# subdivisions = '+nsubdiv);
			break;
		case 'r':
		case 'R':
			orbit.reset();
			break;
			
	}
	if(event.key>='0' && event.key<='9') {
		let index = 9;
		if(event.key>'0')	index = event.key-'1';
		if(index<objStrings.length) {
			loadOBJ(objStrings[index]);
			message('loaded mesh '+objNames[index]);
		}
	}
}

window.addEventListener('keydown',  onKeyDown,  false);

function animate() {
	requestAnimationFrame( animate );
	//if(orbit) orbit.update();
	if(scene && camera)	{
		light.position.set(camera.position.x, camera.position.y, camera.position.z);
		renderer.render(scene, camera);
	}
}

animate();
