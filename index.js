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
  // 2. Initialize the 3D GUI Manager
  const gui3DManager = new BABYLON.GUI.GUI3DManager(scene)

  // Create an invisible anchor node to anchor your right-hand dashboard
  const sideDashboardAnchor = new BABYLON.TransformNode(
    'sideDashboardAnchor',
    scene,
  )

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
  const totalItems = partNames.length

  // Radius of the circle arrangement (in meters) - adjust this to expand/shrink the ring
  const circleRadius = 0.17

  try {
    await BABYLON.SceneLoader.ImportMeshAsync(
      '', // Mesh names (empty string imports all)
      './objs/',
      'obj.glb',
      scene,
    )
    console.log('Model loaded successfully!')

    // Create a main 3D layout panel to automatically align our controls
    const main3DPanel = new BABYLON.GUI.StackPanel3D(false) // false = horizontal arrangement
    gui3DManager.addControl(main3DPanel)

    // Position the master control panel comfortably in front of the VR user
    main3DPanel.position = new BABYLON.Vector3(0, 1.2, 1.8)

    partNames.forEach((partName, index) => {
      const targetMesh = scene.getMeshByName(partName)

      if (targetMesh) {
        if (!targetMesh.material) {
          targetMesh.material = new BABYLON.PBRMaterial(
            'mat_' + partName,
            scene,
          )
        }

        // FIX 1: Create a flat, single-sided 3D Plane mesh instead of a cube button.
        // This completely eliminates mirrored text and duplicate face clicks.
        const pickerPlane = BABYLON.MeshBuilder.CreatePlane(
          'plane_' + partName,
          {
            width: 0.15,
            height: 0.15,
            sideOrientation: BABYLON.Mesh.FRONTSIDE,
          },
          scene,
        )

        // 2. FORCE PLANE TO OVERLAY ON TOP OF ALL MESHES (No hiding under furniture)
        // Move the picker plane to a higher rendering group index (default is 0, foreground is 1)
        pickerPlane.renderingGroupId = 1

        // 3. Prevent depth testing on the plane's internal utility material
        // We need to wait a tiny split-second for the AdvancedDynamicTexture to auto-generate its material
        setTimeout(() => {
          if (pickerPlane.material) {
            // Disabling depth testing prevents the engine from hiding it behind other geometry
            pickerPlane.material.disableDepthWrite = true
            pickerPlane.material.needDepthBuffer = false
          }
        }, 50)

        // Parent the plane to our smooth tracking dashboard node
        pickerPlane.parent = sideDashboardAnchor

        // FIX 2: Trigonometric Circular Arrangement (X and Y coordinates)
        const angle = (index / totalItems) * Math.PI * 2
        pickerPlane.position.x = Math.cos(angle) * circleRadius
        pickerPlane.position.y = Math.sin(angle) * circleRadius
        pickerPlane.position.z = 0

        // Create a dedicated UI canvas exclusively for this flat plane
        const planeTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateForMesh(
          pickerPlane,
          512,
          512,
        )

        const innerLayout = new BABYLON.GUI.StackPanel()
        innerLayout.width = '100%'
        innerLayout.height = '100%'
        planeTexture.addControl(innerLayout)

        // Text Label
        const textLabel = new BABYLON.GUI.TextBlock()
        textLabel.text = partName
        textLabel.color = 'yellow'
        textLabel.fontSize = 32
        textLabel.height = '50px'
        innerLayout.addControl(textLabel)

        // Fixed Scale Native Color Picker Wheel
        const pickerWheel = new BABYLON.GUI.ColorPicker()
        pickerWheel.width = '420px'
        pickerWheel.height = '420px'
        pickerWheel.value =
          targetMesh.material.albedoColor || BABYLON.Color3.White()

        pickerWheel.onValueChangedObservable.add(function (value) {
          targetMesh.material.albedoColor.copyFrom(value)
        })

        innerLayout.addControl(pickerWheel)
      }
    })
  } catch (error) {
    console.error('Error loading model:', error)
    alert(error)
  }

  // 4. VR Camera Tracking Engine (Keeps the buttons floating near you)
  scene.onBeforeRenderObservable.add(() => {
    const vrCamera = scene.activeCamera
    if (!vrCamera) return

    // Get your exact looking vector direction
    const forwardRay = vrCamera.getForwardRay(0.9) // Floating 90cm away
    const baseTarget = forwardRay.origin.add(forwardRay.direction)

    // FIX 3: Shift the center anchor to your Right-Hand Side
    // We fetch the right-hand directional vector from the camera matrix
    const cameraMatrix = vrCamera.getWorldMatrix()
    const rightDirection = new BABYLON.Vector3(
      cameraMatrix.m[0],
      cameraMatrix.m[1],
      cameraMatrix.m[2],
    )

    // Push the entire setup 45 centimeters to your right and down to chest-level
    baseTarget.addInPlace(rightDirection.scale(0.45))
    baseTarget.y -= 0.15

    // Smooth LERP slide to prevent jarring headset micro-stuttering
    sideDashboardAnchor.position = BABYLON.Vector3.Lerp(
      sideDashboardAnchor.position,
      baseTarget,
      0.05,
    )

    // Face the player directly
    sideDashboardAnchor.lookAt(vrCamera.position)

    // Rotate 180 degrees around Y-axis so the texture faces you, not away
    sideDashboardAnchor.rotate(BABYLON.Axis.Y, Math.PI, BABYLON.Space.LOCAL)
  })
}

await main()
