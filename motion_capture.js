/*
list of our fluffy's bones UWU :
torso1
 leg1_R
  leg2_R
 leg1_L
  leg2_L
 torso2
  head
  arm1_R
   arm2_R
  arm1_L
   arm2_L
*/


//To avoid searching through whole elements of list, we give specific index number instead of string.

var indices = {
nose : 0,
leftEye : 1,
rightEye : 2,
leftEar : 3,
rightEar : 4,
leftShoulder : 5,
rightShoulder : 6,
leftElbow : 7,
rightElbow : 8,
leftWrist : 9,
rightWrist : 10,
leftHip : 11,
rightHip : 12,
leftKnee : 13,
rightKnee : 14,
leftAnkle : 15,
rightAnkle : 16
}

//Minimum esimation value to animate fluffy's each bone
var minConfidence = 0.6;

var bonesToInvisible = [];


var animal, animalCtx;  // element to draw fluffy and its webGl context
var human, humanCtx; // element to draw webcam and its context
//var fursona; // image element for hiding face in webcam. In case you record but don't want to show your face



//spine runtime asset manager object
var assetManager;

//spine runtime rendering object
var debug;

//spine runtime skeleton object
var fluffy;

//bones to visible in debug of sar animal
var leg1_R, leg2_R, leg1_L, leg2_L, arm1_R, arm2_R, arm1_L, arm2_L;
var torso1, torso2, head;
var root;

//posenet object
var net;



async function init() {

  //assign html element to draw fluffy
  animal = document.getElementById("fluffy");
  animal.width = 1200;
  animal.height = 1000;
  var config = { alpha: false };
  animalCtx = animal.getContext("webgl", config);

  //create asset manager object
  assetManager = new spine.webgl.AssetManager(animalCtx);

  //create fluffy-rendering object
  debug = new spine.webgl.SceneRenderer(animal, animalCtx);

  assetManager.loadTextureAtlas("assets/fluffy.atlas");
  assetManager.loadText("assets/fluffy.json");

  //play webcam, not visible yet
  var video = document.getElementById("video");
  const stream = await navigator.mediaDevices.getUserMedia({
    "audio" : false,
    "video" : {
      facingMode : 'user',
      width : 600,
      height : 500
    }
  });
  video.srcObject = stream;
  video.width = 600;
  video.height = 500;

  video.play();


  //assign html element to draw webcam and its estimated pose diagrams
  human = document.getElementById("human");
  human.width = 600;
  human.height = 500;
  humanCtx = human.getContext('2d');

  //assign html element to hide faces when it's needed
  //fursona = document.getElementById("fursona");


  net = await posenet.load({
    architecture : 'MobileNetV1',
    outputStride : 16,
    inputResolution : 500,
    multiplier : 0.75,
    quantBytes : 2
  });

  requestAnimationFrame(load);
}

function load () {
  // Wait until the AssetManager has loaded all resources, then load the skeletons.
  if (assetManager.isLoadingComplete()) {

    //parachute animation preset is good for motion capture, because it disabled all IK bones and transform constrains.
    fluffy = loadfluffy("parachute/fall", false);

    // Assign every targetted bones. we do this before rendering, else searching for this bone will need searching through 30-long lists each time, each frame.
    root = fluffy.skeleton.findBone("root");
    torso1 = fluffy.skeleton.findBone("torso1");
    leg1_R = fluffy.skeleton.findBone("leg1_R");
    leg2_R = fluffy.skeleton.findBone("leg2_R");
    leg1_L = fluffy.skeleton.findBone("leg1_L");
    leg2_L = fluffy.skeleton.findBone("leg2_L");
    torso2 = fluffy.skeleton.findBone("torso2");
    head = fluffy.skeleton.findBone("head");
    arm1_R = fluffy.skeleton.findBone("arm1_R");
    arm2_R = fluffy.skeleton.findBone("arm2_R");
    arm1_L = fluffy.skeleton.findBone("arm1_L");
    arm2_L = fluffy.skeleton.findBone("arm2_L");

    // initial update of fluffy animal.
    fluffy.state.update(0.0333);
    fluffy.state.apply(fluffy.skeleton);

    //camera(in Spine runtime) position's pivot point is middle point, therefore we devide dimentions by 2 and set the camera position to there so that the bottom left point of viewport camera becomes 0, 0
    debug.camera.position.set(animal.width / 2, animal.height / 2,0);

    //options of debugging of fluffy
    debug.skeletonDebugRenderer.drawBones = true;
    debug.skeletonDebugRenderer.drawRegionAttachments = false;
    debug.skeletonDebugRenderer.drawBoundingBoxes = false;
    debug.skeletonDebugRenderer.drawMeshHull = false;
    debug.skeletonDebugRenderer.drawMeshTriangles = false;
    debug.skeletonDebugRenderer.drawPaths = false;
    debug.skeletonDebugRenderer.drawSkeletonXY = false;
    debug.skeletonDebugRenderer.drawClipping = false;
    debug.skeletonDebugRenderer.premultipliedAlpha = true;


    // we make list for bones to hide in fluffy debug
    for (var i = 0, n = fluffy.skeleton.bones.length; i < n; i++) {
      var _bone = fluffy.skeleton.bones[i];
      if (
        ["torso1", "leg1_R", "leg2_R",
        "leg1_L", "leg2_L", "torso2",
        "head", "arm1_R", "arm2_R",
        "arm1_L", "arm2_L", "head2", "root"].includes(_bone.data.name)
      ) {
        continue
      }
      else {
      bonesToInvisible.push(_bone.data.name);
      }
    }




    requestAnimationFrame(render); // Loading is done, call render every frame.
  } else {
    requestAnimationFrame(load);
  }
}


function loadfluffy (initialAnimation, premultipliedAlpha) {
  // Load the texture atlas from the AssetManager.
  var atlas = assetManager.get("assets/fluffy.atlas");

  // Create a AtlasAttachmentLoader that resolves region, mesh, boundingbox and path attachments
  var atlasLoader = new spine.AtlasAttachmentLoader(atlas);

  // Create a SkeletonBinary instance for parsing the .skel file.
  var skeletonJson = new spine.SkeletonJson(atlasLoader);

  // Set the scale to apply during parsing, parse the file, and create a new skeleton.
  skeletonJson.scale = 1;
  var skeletonData = skeletonJson.readSkeletonData(assetManager.get("assets/fluffy.json"));
  var skeleton = new spine.Skeleton(skeletonData);
  skeleton.setSkinByName("Bat/Bat");
  var bounds = calculateSetupPoseBounds(skeleton);

  // Create an AnimationState, and set the initial animation in looping mode.
  var animationStateData = new spine.AnimationStateData(skeleton.data);
  var animationState = new spine.AnimationState(animationStateData);
  animationState.setAnimation(0, initialAnimation, true);

  // Pack everything up and return to caller.
  return { skeleton: skeleton, state: animationState, bounds: bounds, premultipliedAlpha: premultipliedAlpha };
}

function calculateSetupPoseBounds (skeleton) {
  skeleton.setToSetupPose();
  skeleton.updateWorldTransform();
  var offset = new spine.Vector2();
  var size = new spine.Vector2();
  skeleton.getBounds(offset, size, []);
  return { offset: offset, size: size };
}



async function render () {


  const pose = await net.estimateSinglePose(video, {
    flipHorizontal: false,
    decodingMethod: 'single-person'
  });


  animalCtx.clearColor(0.3, 0.3, 0.3, 1);
  animalCtx.clear(animalCtx.COLOR_BUFFER_BIT);



  //prepare for skeleton data to animate upon coords of estimated pose
  var skeleton = fluffy.skeleton;
  var state = fluffy.state;

  debug.begin();




  // manipulate bones manually upon pose detection
  animateDetectedBone(head, pose.keypoints[indices.rightEye], pose.keypoints[indices.leftEye], minConfidence, skeleton);
  animateDetectedBone(leg1_L, pose.keypoints[indices.leftHip], pose.keypoints[indices.leftKnee], minConfidence, skeleton);
  animateDetectedBone(leg2_L, pose.keypoints[indices.leftKnee], pose.keypoints[indices.leftAnkle], minConfidence, skeleton);
  animateDetectedBone(leg1_R, pose.keypoints[indices.rightHip], pose.keypoints[indices.rightKnee], minConfidence, skeleton);
  animateDetectedBone(leg2_R, pose.keypoints[indices.rightKnee], pose.keypoints[indices.rightAnkle], minConfidence, skeleton);
  animateDetectedBone(arm1_L, pose.keypoints[indices.leftShoulder], pose.keypoints[indices.leftElbow], minConfidence, skeleton);
  animateDetectedBone(arm2_L, pose.keypoints[indices.leftElbow], pose.keypoints[indices.leftWrist], minConfidence, skeleton);
  animateDetectedBone(arm1_R, pose.keypoints[indices.rightShoulder], pose.keypoints[indices.rightElbow], minConfidence, skeleton);
  animateDetectedBone(arm2_R, pose.keypoints[indices.rightElbow], pose.keypoints[indices.rightWrist], minConfidence, skeleton);
  animateDetectedBone(torso1, pose.keypoints[indices.rightHip], pose.keypoints[indices.leftHip], minConfidence, skeleton);
  animateDetectedBone(torso2, pose.keypoints[indices.rightShoulder], pose.keypoints[indices.leftShoulder], minConfidence, skeleton);

  skeleton.updateWorldTransform();



  //draw fluffy on animal canvas
  debug.drawSkeleton(skeleton, false);
  debug.drawSkeletonDebug(skeleton, false, bonesToInvisible);

  debug.end();


  //draw webcam on human canvas
  humanCtx.save();
  humanCtx.drawImage(video, 0, 0, 600, 500);
  //un-comment line below if you want to hide your face for record n share purpose
  //humanCtx.drawImage(fursona, pose.keypoints[indices.nose].position.x-75, pose.keypoints[indices.nose].position.y-63, 150, 126);
  humanCtx.restore();

  //draw estimated pose diagrams on webcam
  drawKeypoints(pose.keypoints, minConfidence, humanCtx,1,"#00ff00");
  drawSkeleton(pose.keypoints, minConfidence, humanCtx,1,"#ffffff");





  requestAnimationFrame(render);
}


// result angle is x-axis flipped angle. because esimated coords have y-axis inverted in graphical coord standard
function getAngle(initPt,termPt){
  var x = termPt.x - initPt.x;
  var y = termPt.y - initPt.y;
  var l = Math.sqrt(x ** 2 + y **2);
  var co = x / l;
  var angle;

  if ( y > 0) {angle = Math.acos(co) * (180 / Math.PI)} else {angle = 360 - Math.acos(co) * (180 / Math.PI)}

  //flip the angle upon x-axis, because coords has y-axis inverted.
  angle = 360 - angle;

  return angle;
}


/*
* Returns {x,y} position property of given keypointName
*
* @param {string} name of keypoint you want to find its position
* @param {array} full list of keypoints you want to search within
* @return {object} x, y position property
*/
function findKeypoint(keypointName, keypoints) {
  if (keypointName == null) throw new Error("keypointName cannot be null.");
  for (var i = 0; i < keypoints.length; i++) {
    var keypoint = keypoints[i];
    if (keypoint.part == keypointName)
      return keypoint.position;
  }
  return null;
}

function drawPoint(ctx, x, y, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * Draw pose keypoints onto a canvas
 */
function drawKeypoints(keypoints, minConfidence, ctx, scale = 1, color) {
  for (let i = 0; i < keypoints.length; i++) {
    const keypoint = keypoints[i];

    if (keypoint.score < minConfidence) {
      continue;
    }

    const {x, y} = keypoint.position;
    drawPoint(ctx, x * scale, y * scale, 3, color);
  }
}

/**
 * Draws a pose skeleton by looking up all adjacent keypoints/joints
 */
function drawSkeleton(keypoints, minConfidence, ctx, scale = 1, color) {
  const adjacentKeyPoints =
      posenet.getAdjacentKeyPoints(keypoints, minConfidence);

  adjacentKeyPoints.forEach((keypoints) => {
    drawSegment(
        toTuple(keypoints[0].position), toTuple(keypoints[1].position), color,
        scale, ctx);
  });
}

/**
 * Draws a line on a canvas, i.e. a joint
 */
function drawSegment([ax, ay], [bx, by], color, scale, ctx) {
  ctx.beginPath();
  ctx.moveTo(ax * scale, ay * scale);
  ctx.lineTo(bx * scale, by * scale);
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.stroke();
}

function toTuple({x, y}) {
  return [x, y];
}

// Get two keypoints, a character bone and minConfidence
// Animate bone if minimum confidence condition is met
function animateDetectedBone(chaBone, initKeyPt, termKeyPt, minConfidence, skeleton) {
  if (initKeyPt.score > minConfidence && termKeyPt.score > minConfidence) {
    var chaScale; // relative size ratio between human torso width and fluffy torso width shown on html canvas
    chaBone.rotation = chaBone.worldToLocalRotation(getAngle(initKeyPt.position, termKeyPt.position));

    if (["head", "torso1", "torso2"].includes(chaBone.data.name)) {
      if(initKeyPt.position.x < termKeyPt.position.x){
        chaBone.rotation += 90;
      }
      else {
        chaBone.rotation -= 90;
      }
    }

    if ("torso1" == chaBone.data.name) {

      //zoom in or out by taking ratio between the width of human torso(px degree) and the width of fluffy torso(px degree). Human's torso width is taken from both hip points.
      var distanceKeys = Math.sqrt((initKeyPt.position.x - termKeyPt.position.x) ** 2 + (initKeyPt.position.y - termKeyPt.position.y) ** 2);
      var chaTorsoWidth = 100;

      chaScale = (distanceKeys * (animal.width / human.width) / chaTorsoWidth);
      debug.camera.viewportWidth = animal.width / chaScale;
      debug.camera.viewportHeight = animal.height / chaScale;
      //re-position camera. last param should be 0 because it's 3 dimentional in webgl context but we don't need z axis.
      debug.camera.position.set(debug.camera.viewportWidth / 2, debug.camera.viewportHeight / 2,0);


      //position fluffy by moving torso1 bone upon middle point coords of hip points of estimated pose.
      var posCha = {x : ((initKeyPt.position.x + termKeyPt.position.x) / 2 ) * (animal.width / human.width), y : animal.height - ((initKeyPt.position.y + termKeyPt.position.y) / 2) * (animal.width / human.width)};
      chaBone.x = posCha.x;
      chaBone.y = posCha.y;
    }
    // skeleton's all bones should be updated whenever a bone's transform is changed.
    skeleton.updateWorldTransform();
  }

}

init();
