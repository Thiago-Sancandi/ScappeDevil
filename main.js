import * as THREE from './libs/three.module.js';
import { GLTFLoader } from './libs/GLTFLoader.js';
import { PointerLockControls } from './libs/PointerLockControls.js';

let camera, scene, renderer, controls;
let demon, demonMixer, clock;
let patrolPoints = [new THREE.Vector3(10, 0, 10), new THREE.Vector3(-10, 0, -10)];
let currentPoint = 0;
let state = 'patrolling';
let stepSound, growlSound;

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  clock = new THREE.Clock();

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 2, 5);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  controls = new PointerLockControls(camera, document.body);
  document.body.addEventListener('click', () => controls.lock());
  scene.add(controls.getObject());

  // Luz
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  hemiLight.position.set(0, 200, 0);
  scene.add(hemiLight);

  // Chão
  const floorTex = new THREE.TextureLoader().load('./textures/floor.jpg');
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(25, 25);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ map: floorTex })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // Paredes
  const wallTex = new THREE.TextureLoader().load('./textures/wall.jpg');
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex });
  for (let i = -50; i <= 50; i += 10) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 1), wallMat);
    wall.position.set(i, 2.5, -20);
    scene.add(wall);
  }

  // Carregar demônio
  const loader = new GLTFLoader();
  loader.load('./models/demon.glb', gltf => {
    demon = gltf.scene;
    demon.scale.set(2, 2, 2);
    demon.position.set(10, 0, 10);
    scene.add(demon);

    demonMixer = new THREE.AnimationMixer(demon);
    if (gltf.animations.length > 0) {
      const action = demonMixer.clipAction(gltf.animations[0]);
      action.play();
    }

    // Som
    const listener = new THREE.AudioListener();
    camera.add(listener);
    stepSound = new THREE.PositionalAudio(listener);
    growlSound = new THREE.PositionalAudio(listener);

    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('./audio/step-heavy.mp3', buffer => {
      stepSound.setBuffer(buffer);
      stepSound.setRefDistance(20);
      stepSound.setLoop(true);
      demon.add(stepSound);
      stepSound.play();
    });
    audioLoader.load('./audio/growl-low.mp3', buffer => {
      growlSound.setBuffer(buffer);
      growlSound.setRefDistance(30);
      growlSound.setLoop(true);
      demon.add(growlSound);
      growlSound.play();
    });
  });

  // Resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function moveDemon(delta) {
  if (!demon) return;

  const target = patrolPoints[currentPoint];
  const direction = new THREE.Vector3().subVectors(target, demon.position);
  const distance = direction.length();

  const playerPos = controls.getObject().position;
  const distToPlayer = demon.position.distanceTo(playerPos);

  // Visão do demônio
  const visionRange = 15;
  if (distToPlayer < visionRange) {
    state = 'chasing';
  }

  if (state === 'patrolling') {
    direction.normalize();
    demon.position.add(direction.multiplyScalar(2 * delta));
    if (distance < 1) currentPoint = (currentPoint + 1) % patrolPoints.length;
  } else if (state === 'chasing') {
    const chaseDir = new THREE.Vector3().subVectors(playerPos, demon.position).normalize();
    demon.position.add(chaseDir.multiplyScalar(3 * delta));

    if (distToPlayer < 1.5) {
      alert('Você foi pego pelo Scape Devil!');
      location.reload();
    }
  }

  demon.lookAt(state === 'chasing' ? playerPos : target);
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (demonMixer) demonMixer.update(delta);
  moveDemon(delta);
  renderer.render(scene, camera);
}
