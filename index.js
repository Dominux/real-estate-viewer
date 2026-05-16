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

    xr.minZ = 0.01
    xr.maxZ = 100
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

    // Create a 3D Virtual Plane to hold the UI panel
    const guiPlane = BABYLON.MeshBuilder.CreatePlane(
      'guiPlane',
      { width: 3, height: 1.5 },
      scene,
    )
    guiPlane.position = new BABYLON.Vector3(0, 1.3, 1.5) // Placed comfortably in front of user

    // Create an Advanced Dynamic Texture mapped to the 3D plane
    const advancedTexture =
      BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(guiPlane)

    // Create a horizontal container grid to house all 7 pickers side-by-side
    const grid = new BABYLON.GUI.Grid()
    grid.addColumnDefinition(1 / 7, true) // Create 7 equal columns
    grid.addColumnDefinition(1 / 7, true)
    grid.addColumnDefinition(1 / 7, true)
    grid.addColumnDefinition(1 / 7, true)
    grid.addColumnDefinition(1 / 7, true)
    grid.addColumnDefinition(1 / 7, true)
    grid.addColumnDefinition(1 / 7, true)
    advancedTexture.addControl(grid)

    // Array matching your Blender part names
    const partNames = [
      'Floor',
      'Lower plintus',
      'Bottom wallpaper',
      'Dado rail',
      'Top wallpaper',
      'Higher plintus',
      'Ceiling',
    ]

    // 3. Generate Native Color Pickers
    partNames.forEach((partName, index) => {
      const targetMesh = scene.getMeshByName(partName)

      if (targetMesh) {
        // Ensure material exists
        if (!targetMesh.material) {
          targetMesh.material = new BABYLON.PBRMaterial(
            'mat_' + partName,
            scene,
          )
        }

        // Create a small layout stack inside the grid column
        const columnStack = new BABYLON.GUI.StackPanel()
        grid.addControl(columnStack, 0, index)

        // Add a text label above the wheel
        const label = new BABYLON.GUI.TextBlock()
        label.text = partName
        label.color = 'white'
        label.height = '30px'
        columnStack.addControl(label)

        // Instantiate the NATIVE Babylon Color Picker wheel
        const picker = new BABYLON.GUI.ColorPicker()
        picker.value = targetMesh.material.albedoColor || BABYLON.Color3.White()
        picker.height = '150px'
        picker.width = '150px'

        // Critical Event: Fires when user targets the wheel with VR laser and adjusts it
        picker.onValueChangedObservable.add((value) => {
          // IMPORTANT: Use copyFrom to maintain performance and avoid GC spikes in VR
          targetMesh.material.albedoColor.copyFrom(value)
        })

        columnStack.addControl(picker)
      }
    })
  } catch (error) {
    console.error('Error loading model:', error)
    alert(error)
  }
}

await main()
