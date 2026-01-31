console.log('Started')

const main = async () => {
  const canvas = document.getElementById('canvas')

  const engine = new BABYLON.Engine(canvas, true)

  const scene = await createScene(engine)

  engine.runRenderLoop(() => {
    scene.render()
  })

  window.addEventListener('resize', () => {
    engine.resize()
  })
}

const createScene = async (engine) => {
  const scene = new BABYLON.Scene(engine)

  const camera = new BABYLON.FreeCamera(
    'camera1',
    new BABYLON.Vector3(0, 1.5, 0),
    scene,
  )

  camera.setTarget(BABYLON.Vector3.Zero())

  camera.attachControl(canvas, true)

  const light = new BABYLON.HemisphericLight(
    'light',
    new BABYLON.Vector3(1, 4, -1),
    scene,
  )

  light.intensity = 0.7

  const env = scene.createDefaultEnvironment()

  // here we add XR support

  const protocol = window.location.protocol

  if (protocol === 'https:') {
    const xr = await scene.createDefaultXRExperienceAsync({
      floorMeshes: [env.ground],
    })
  }

  await loadObj(scene)

  return scene
}

const loadObj = async (scene) => {
  try {
    await BABYLON.SceneLoader.ImportMeshAsync(
      '', // Mesh names (empty string imports all)
      './objs/',
      'obj.glb',
      scene,
    )
    console.log('Model loaded successfully!')
  } catch (error) {
    console.error('Error loading model:', error)
    alert(error)
  }
}

await main()
