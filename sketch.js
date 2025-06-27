function animateMovement(pawn, targetPos) {
  animatingPawn = {
    pawn: pawn,
    startPos: pawn.position.copy(),
    targetPos: targetPos,
    startTime: millis()
  };
}

let board;
let whitePawn;
let blackPawns = [];
let isGameOver = false;
let replayButton;
let currentTurn = "white";
let blackPawnIndex = 0;

// Visual effects variables
let particles = [];
let gameStartTime;
let lastMoveTime = 0;
let animatingPawn = null;
let animationStart = 0;
let animationDuration = 300; // milliseconds
let boardTheme = "pixel";
let showGrid = true;
let captureEffect = null;

// UI state variables
let gameState = "welcome"; // "welcome", "playing", "paused", "gameOver"
let menuButton;
let pauseMenu = {
  visible: false,
  buttons: []
};

// Add global board offset variables
let boardOffsetX = 0;
let boardOffsetY = 0;

function setup() {
  // Create responsive canvas for mobile
  let canvasSize = min(windowWidth - 20, windowHeight - 100, 500);
  createCanvas(canvasSize, canvasSize);
  
  // Store canvas size for responsive calculations
  boardSize = canvasSize - 100; // Leave space for UI
  cellSize = boardSize / 8;
  
  // Center the board
  boardOffsetX = (width - boardSize) / 2;
  boardOffsetY = (height - boardSize) / 2;
  
  // Disable anti-aliasing for pixel art effect
  noSmooth();
  
  board = new Board();
  // White pawn starts on row 7, 5th block (index 4) - which is a black square
  whitePawn = new Pawn('white', createVector(4, 7));
  
  // Black pawns start on BLACK squares (dark squares) in row 0
  // In row 0: black squares are at positions 1, 3, 5, 7 (odd numbers)
  for (let i = 0; i < 4; i++) {
    let positions = [1, 3, 5, 7]; // All black/dark squares in row 0
    blackPawns.push(new Pawn('black', createVector(positions[i], 0)));
  }
  
  // Create UI buttons with responsive positioning
  replayButton = createButton('Replay');
  replayButton.mousePressed(restartGame);
  replayButton.position(width - 100, height + 20);
  replayButton.hide();
  
  menuButton = createButton('⚙️');
  menuButton.mousePressed(togglePauseMenu);
  menuButton.position(width - 60, 20);
  menuButton.style('background-color', '#333');
  menuButton.style('color', '#fff');
  menuButton.style('border', '2px solid #fff');
  menuButton.style('padding', '12px 18px');
  menuButton.style('font-family', 'monospace');
  menuButton.style('font-size', '24px');
  menuButton.style('border-radius', '8px');
  
  gameStartTime = millis();
  gameState = "welcome";
}

// Add responsive variables
let boardSize;
let cellSize;

function draw() {
  // Simple dark grey background
  background(30);
  
  // Handle different game states
  if (gameState === "welcome") {
    drawWelcomeScreen();
    return;
  }
  
  push();
  // Center the board
  translate(boardOffsetX, boardOffsetY);
  
  board.display();
  
  if (gameState === "playing" && !isGameOver) {
    // Update and display particles
    updateParticles();
    
    // Display all pawns with pixel art style
    for (let pawn of blackPawns) {
      pawn.display();
    }
    whitePawn.display();
    
    // Show possible moves with pixel art visuals
    if (currentTurn === "white") {
      showPossibleMoves();
    }
    
    // Display capture effect
    if (captureEffect) {
      displayCaptureEffect();
    }
    
  } else if (gameState === "paused") {
    // Display paused game (dimmed)
    tint(255, 100);
    for (let pawn of blackPawns) {
      pawn.display();
    }
    whitePawn.display();
    noTint();
    
  } else if (isGameOver) {
    for (let pawn of blackPawns) {
      pawn.display();
    }
    whitePawn.display();
    displayGameOver();
    replayButton.show();
  }
  
  pop();
  
  // Draw pause menu if visible
  if (pauseMenu.visible) {
    drawPauseMenu();
  }
  
  // Show turn indicator only when playing
  if (gameState === "playing") {
    showTurnIndicator();
  }
  
  checkGameOver();
}

function drawPixelBackground() {
  // Create halftone/dithered gradient background inspired by reference
  let time = millis() * 0.0005; // Slower animation
  
  // Draw base gradient
  for (let y = 0; y < height; y += 2) {
    let gradientProgress = y / height;
    let baseGray = lerp(240, 10, gradientProgress);
    stroke(baseGray);
    line(0, y, width, y);
    line(0, y + 1, width, y + 1);
  }
  
  // Add halftone dot pattern overlay with responsive sizing
  let dotSpacing = max(4, cellSize / 8); // Responsive dot spacing
  for (let y = 0; y < height; y += dotSpacing) {
    for (let x = 0; x < width; x += dotSpacing) {
      // Calculate gradient position (0 = top/white, 1 = bottom/black)
      let gradientPos = y / height;
      
      // Add subtle wave animation
      let wave = sin(time * 2 + x * 0.02 + y * 0.01) * 0.1;
      let animatedPos = constrain(gradientPos + wave, 0, 1);
      
      // Calculate dot size based on gradient position
      // Top = small dots (light areas), Bottom = large dots (dark areas)
      let maxDotSize = dotSpacing * 0.9;
      let dotSize = animatedPos * maxDotSize;
      
      // Only draw dots if they should be visible
      if (dotSize > 0.5) {
        // Dots get darker as they get bigger (toward bottom)
        let dotColor = lerp(180, 0, animatedPos);
        
        fill(dotColor);
        noStroke();
        
        // Create slightly offset halftone pattern
        let offsetX = (y / dotSpacing) % 2 === 0 ? 0 : dotSpacing * 0.5;
        ellipse(x + offsetX, y, dotSize, dotSize);
      }
    }
  }
  
  // Add some horizontal line texture for extra halftone effect
  stroke(0, 30);
  strokeWeight(1);
  for (let y = height * 0.7; y < height; y += 3) {
    let alpha = map(y, height * 0.7, height, 0, 80);
    stroke(0, alpha);
    line(0, y, width, y);
  }
}

function mousePressed() {
  // Handle pause menu clicks
  if (pauseMenu.visible) {
    handlePauseMenuClick();
    return;
  }
  
  // Handle welcome screen click
  if (gameState === "welcome") {
    startGame();
    return;
  }
  
  // Handle game clicks only when playing
  if (gameState !== "playing" || isGameOver || currentTurn !== "white" || animatingPawn) {
    return;
  }
  
  let adjustedX = mouseX - boardOffsetX;
  let adjustedY = mouseY - boardOffsetY;
  
  let target = createVector(floor(adjustedX / cellSize), floor(adjustedY / cellSize));
  if (whitePawn.isValidMove(target)) {
    
    // Check if capturing a black pawn
    let capturedPawn = null;
    for (let i = blackPawns.length - 1; i >= 0; i--) {
      if (blackPawns[i].position.equals(target)) {
        capturedPawn = blackPawns[i];
        blackPawns.splice(i, 1);
        break;
      }
    }
    
    // Create capture effect if pawn was captured
    if (capturedPawn) {
      createCaptureEffect(capturedPawn.position);
      createParticles(capturedPawn.position, color(255), 15);
    }
    
    // Animate white pawn movement
    animateMovement(whitePawn, target);
    
    // Create movement particles
    createParticles(whitePawn.position, color(200), 8);
    
    currentTurn = "black";
    setTimeout(() => {
      if (!isGameOver) moveNextBlackPawn();
    }, animationDuration + 100);
  }
}

// Add touch support for mobile
function touchStarted() {
  if (typeof mousePressed === 'function') {
    mousePressed();
  }
  return false; // Prevent default scrolling
}

function drawWelcomeScreen() {
  // Semi-transparent overlay
  fill(0, 0, 0, 180);
  rect(0, 0, width, height);
  
  // Welcome message
  push();
  translate(width/2, height/2);
  
  // Main title with halftone effect - properly centered
  textAlign(CENTER, CENTER);
  drawPixelGlowText("CHESS BREAKTHROUGH", 0, -80, 28, color(255));
  
  // Subtitle and credit
  drawPixelGlowText("Pixel Art Edition", 0, -45, 16, color(200));
  drawPixelGlowText("by Nevo Alroey", 0, -25, 14, color(180));
  
  // Game description
  fill(220);
  textAlign(CENTER, CENTER);
  textSize(14);
  text("Goal: Move your white king to the top row", 0, 5);
  text("Move diagonally on black squares - Ultra-smart AI awaits!", 0, 25);
  text("Black pawns use advanced coordination to stop you!", 0, 45);
  
  // Start instruction with pulsing effect
  let pulse = sin(millis() * 0.008) * 50 + 200;
  fill(255, pulse);
  textSize(18);
  text("Click anywhere to start", 0, 85);
  
  // Controls info
  fill(150);
  textSize(12);
  text("Click green squares to move diagonally • Use Menu button to pause", 0, 115);
  
  pop();
}

function drawPauseMenu() {
  // Semi-transparent overlay
  fill(0, 0, 0, 150);
  rect(0, 0, width, height);
  
  // Menu background with halftone border
  let menuX = width/2 - 120;
  let menuY = height/2 - 100;
  let menuW = 240;
  let menuH = 200;
  
  // Menu background
  fill(40);
  stroke(255);
  strokeWeight(3);
  rect(menuX, menuY, menuW, menuH);
  
  // Menu title
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(20);
  text("GAME PAUSED", width/2, menuY + 30);
  
  // Menu options
  fill(200);
  textSize(14);
  text("Game is paused", width/2, menuY + 60);
  
  // Buttons
  drawMenuButton("Continue", width/2, menuY + 100, 100, 25);
  drawMenuButton("Restart", width/2, menuY + 140, 100, 25);
}

function drawMenuButton(label, x, y, w, h) {
  push();
  
  // Check if mouse is over button
  let isHover = mouseX > x - w/2 && mouseX < x + w/2 && 
                mouseY > y - h/2 && mouseY < y + h/2;
  
  // Button background
  if (isHover) {
    fill(80);
    stroke(255);
    strokeWeight(2);
  } else {
    fill(60);
    stroke(180);
    strokeWeight(1);
  }
  
  rect(x - w/2, y - h/2, w, h);
  
  // Button text
  fill(isHover ? 255 : 200);
  textAlign(CENTER, CENTER);
  textSize(12);
  text(label, x, y);
  
  pop();
}

function handlePauseMenuClick() {
  let menuX = width/2 - 120;
  let menuY = height/2 - 100;
  
  // Continue button
  if (mouseX > width/2 - 50 && mouseX < width/2 + 50 && 
      mouseY > menuY + 87 && mouseY < menuY + 113) {
    resumeGame();
  }
  
  // Restart button
  if (mouseX > width/2 - 50 && mouseX < width/2 + 50 && 
      mouseY > menuY + 127 && mouseY < menuY + 153) {
    restartGame();
    pauseMenu.visible = false;
  }
}

function togglePauseMenu() {
  if (gameState === "playing") {
    pauseGame();
  } else if (gameState === "paused") {
    resumeGame();
  }
}

function startGame() {
  gameState = "playing";
  gameStartTime = millis();
}

function pauseGame() {
  gameState = "paused";
  pauseMenu.visible = true;
}

function resumeGame() {
  gameState = "playing";
  pauseMenu.visible = false;
}

function updateAnimations() {
  if (animatingPawn) {
    let elapsed = millis() - animatingPawn.startTime;
    let progress = elapsed / animationDuration;
    
    if (progress >= 1) {
      // Animation complete
      animatingPawn.pawn.position = animatingPawn.targetPos.copy();
      animatingPawn = null;
    } else {
      // Smooth easing animation
      let easedProgress = easeInOutCubic(progress);
      animatingPawn.pawn.displayPosition = p5.Vector.lerp(
        animatingPawn.startPos, 
        animatingPawn.targetPos, 
        easedProgress
      );
    }
  }
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - pow(-2 * t + 2, 3) / 2;
}

function createParticles(pos, col, count) {
  for (let i = 0; i < count; i++) {
    particles.push(new HalftoneParticle(
      boardOffsetX + pos.x * cellSize + cellSize / 2 + random(-cellSize/3, cellSize/3),
      boardOffsetY + pos.y * cellSize + cellSize / 2 + random(-cellSize/3, cellSize/3),
      col
    ));
  }
}

function createCaptureEffect(pos) {
  captureEffect = {
    x: boardOffsetX + pos.x * cellSize + cellSize / 2,
    y: boardOffsetY + pos.y * cellSize + cellSize / 2,
    startTime: millis(),
    duration: 500
  };
}

function displayCaptureEffect() {
  let elapsed = millis() - captureEffect.startTime;
  let progress = elapsed / captureEffect.duration;
  
  if (progress >= 1) {
    captureEffect = null;
    return;
  }
  
  push();
  translate(captureEffect.x, captureEffect.y);
  
  // Halftone-style expanding effect
  let alpha = 255 * (1 - progress);
  let size = 50 * progress;
  
  // Outer ring of dots
  stroke(255, alpha * 0.8);
  strokeWeight(2);
  fill(200, alpha * 0.4);
  
  let numDots = 12;
  for (let i = 0; i < numDots; i++) {
    let angle = (TWO_PI / numDots) * i;
    let dotX = cos(angle) * size * 0.6;
    let dotY = sin(angle) * size * 0.6;
    ellipse(dotX, dotY, 6 * (1 - progress * 0.5));
  }
  
  // Inner ring of smaller dots
  stroke(255, alpha);
  strokeWeight(1);
  fill(150, alpha * 0.6);
  
  for (let i = 0; i < 8; i++) {
    let angle = (TWO_PI / 8) * i + progress * 2; // Rotating
    let dotX = cos(angle) * size * 0.3;
    let dotY = sin(angle) * size * 0.3;
    ellipse(dotX, dotY, 4);
  }
  
  // Center burst - use static dots instead of random for consistency
  fill(255, alpha);
  noStroke();
  let centerDots = 6;
  for (let i = 0; i < centerDots; i++) {
    let angle = (TWO_PI / centerDots) * i + progress * 3;
    let distance = (size * 0.1) * sin(progress * PI);
    let dotX = cos(angle) * distance;
    let dotY = sin(angle) * distance;
    ellipse(dotX, dotY, 3 * (1 - progress));
  }
  
  pop();
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].display();
    
    if (particles[i].isDead()) {
      particles.splice(i, 1);
    }
  }
}

function moveNextBlackPawn() {
  if (blackPawns.length === 0) {
    currentTurn = "white";
    return;
  }
  
  let battlefieldAnalysis = analyzeBattlefield();
  
  let attempts = 0;
  let movesMade = 0;
  
  while (attempts < blackPawns.length && movesMade === 0) {
    if (blackPawnIndex >= blackPawns.length) {
      blackPawnIndex = 0;
    }
    
    let pawn = blackPawns[blackPawnIndex];
    let oldPos = pawn.position.copy();
    let moved = pawn.coordinatedMove(battlefieldAnalysis);
    
    if (moved) {
      console.log("Black pawn moved from", oldPos, "to", pawn.position);
      // Create movement particles for black pawn
      createParticles(oldPos, color(100), 5);
      animateMovement(pawn, pawn.position);
      movesMade++;
    }
    
    blackPawnIndex++;
    attempts++;
  }
  
  if (movesMade === 0) {
    console.log("No black pawns could move");
  }
  
  setTimeout(() => {
    currentTurn = "white";
  }, animationDuration + 100);
}

function analyzeBattlefield() {
  let analysis = {
    whitePawnPosition: whitePawn.position.copy(),
    whitePawnThreats: [],
    formationGaps: [],
    captureOpportunities: [],
    blockingPositions: [],
    formationCenter: null,
    coordinationStrategy: null
  };
  
  analysis.whitePawnThreats = whitePawn.getPossibleMoves().filter(move => 
    move.x >= 0 && move.x < 8 && move.y >= 0 && move.y < 8
  );
  
  analysis.formationGaps = findFormationGaps();
  analysis.formationCenter = calculateFormationCenter();
  
  for (let i = 0; i < blackPawns.length; i++) {
    let pawn = blackPawns[i];
    if (pawn.checkForCapture()) {
      analysis.captureOpportunities.push({pawnIndex: i, pawn: pawn});
    }
  }
  
  analysis.blockingPositions = calculateBlockingPositions();
  analysis.coordinationStrategy = determineStrategy(analysis);
  
  return analysis;
}

function findFormationGaps() {
  let gaps = [];
  let pawnPositions = blackPawns.map(p => p.position);
  
  for (let y = 1; y < 8; y++) {
    let pawnsInRow = pawnPositions.filter(p => p.y === y);
    if (pawnsInRow.length > 0) {
      let minX = Math.min(...pawnsInRow.map(p => p.x));
      let maxX = Math.max(...pawnsInRow.map(p => p.x));
      
      for (let x = minX; x <= maxX; x++) {
        let hasPattern = pawnsInRow.some(p => p.x === x);
        if (!hasPattern) {
          gaps.push(createVector(x, y));
        }
      }
    }
  }
  
  return gaps;
}

function calculateFormationCenter() {
  if (blackPawns.length === 0) return createVector(4, 4);
  
  let avgX = blackPawns.reduce((sum, p) => sum + p.position.x, 0) / blackPawns.length;
  let avgY = blackPawns.reduce((sum, p) => sum + p.position.y, 0) / blackPawns.length;
  
  return createVector(Math.round(avgX), Math.round(avgY));
}

function calculateBlockingPositions() {
  let blockingPositions = [];
  
  for (let threat of whitePawn.getPossibleMoves()) {
    if (threat.x >= 0 && threat.x < 8 && threat.y >= 0 && threat.y < 8) {
      let blockingMoves = [
        createVector(threat.x - 1, threat.y + 1),
        createVector(threat.x + 1, threat.y + 1),
        createVector(threat.x, threat.y + 1)
      ];
      
      for (let block of blockingMoves) {
        if (block.x >= 0 && block.x < 8 && block.y >= 0 && block.y < 8) {
          blockingPositions.push({
            position: block,
            blocksSquare: threat,
            priority: calculateBlockingPriority(block, threat)
          });
        }
      }
    }
  }
  
  blockingPositions.sort((a, b) => b.priority - a.priority);
  return blockingPositions;
}

function calculateBlockingPriority(blockPos, threatPos) {
  let priority = 0;
  
  let distToWhite = abs(blockPos.x - whitePawn.position.x) + abs(blockPos.y - whitePawn.position.y);
  priority += (10 - distToWhite);
  
  if (blockPos.y > whitePawn.position.y) priority += 5;
  
  let distToCenter = abs(blockPos.x - 3.5);
  priority += (4 - distToCenter);
  
  return priority;
}

function determineStrategy(analysis) {
  // EXTREMELY SMART AI strategy to counter white pawn's mobility
  
  if (analysis.captureOpportunities.length > 0) {
    return "INSTANT_CAPTURE"; // Always prioritize capture
  }
  
  let whitePawnPos = whitePawn.position;
  let distanceToGoal = whitePawnPos.y; // Distance to row 0
  let whitePossibleMoves = whitePawn.getPossibleMoves();
  
  // ULTRA CRITICAL - White can win next turn
  if (distanceToGoal === 1) {
    return "LAST_STAND"; // Block everything possible
  }
  
  // CRITICAL ZONE - White pawn very close to winning
  if (distanceToGoal <= 2) {
    return "WALL_OF_DEATH"; // Create impenetrable wall
  }
  
  // Check if white pawn can be completely surrounded
  if (canSurroundWhitePawn(whitePawnPos, whitePossibleMoves)) {
    return "TOTAL_SURROUND"; // Surround and eliminate all escape routes
  }
  
  // DANGER ZONE - White pawn getting close, need coordinated response
  if (distanceToGoal <= 3) {
    return "COORDINATED_NET"; // Cast a coordinated net
  }
  
  // Check for forcing patterns - drive white into a trap
  if (canForceIntoTrap(whitePawnPos)) {
    return "FORCE_TRAP"; // Force white into bad position
  }
  
  // Advanced positioning based on white pawn's escape routes
  let escapeRoutes = countEscapeRoutes(whitePawnPos);
  if (escapeRoutes <= 2) {
    return "CUT_ESCAPE"; // Cut off remaining escape routes
  }
  
  // Early-mid game: Control key squares
  return "TERRITORY_CONTROL"; // Control key territory
}

// Helper functions for AI strategy
function canSurroundWhitePawn(whitePawnPos, whiteMoves) {
  let surroundingSquares = [
    createVector(whitePawnPos.x - 1, whitePawnPos.y - 1),
    createVector(whitePawnPos.x + 1, whitePawnPos.y - 1),
    createVector(whitePawnPos.x - 1, whitePawnPos.y + 1),
    createVector(whitePawnPos.x + 1, whitePawnPos.y + 1)
  ];
  
  let controllableSquares = 0;
  for (let square of surroundingSquares) {
    // Check if any black pawn can reach this square
    for (let pawn of blackPawns) {
      let distance = abs(square.x - pawn.position.x) + abs(square.y - pawn.position.y);
      if (distance <= 2) {
        controllableSquares++;
        break;
      }
    }
  }
  
  return controllableSquares >= 3; // Can control most surrounding squares
}

function canForceIntoTrap(whitePawnPos) {
  // Check if white is near edges where it can be trapped
  return (whitePawnPos.x <= 2 || whitePawnPos.x >= 5) && whitePawnPos.y >= 3;
}

function countEscapeRoutes(whitePawnPos) {
  let routes = 0;
  let possibleEscapes = [
    createVector(whitePawnPos.x - 2, whitePawnPos.y - 2),
    createVector(whitePawnPos.x, whitePawnPos.y - 2),
    createVector(whitePawnPos.x + 2, whitePawnPos.y - 2)
  ];
  
  for (let escape of possibleEscapes) {
    if (escape.x >= 0 && escape.x < 8 && escape.y >= 0) {
      // Check if this escape route is blocked
      let blocked = false;
      for (let pawn of blackPawns) {
        let distance = abs(escape.x - pawn.position.x) + abs(escape.y - pawn.position.y);
        if (distance <= 1) {
          blocked = true;
          break;
        }
      }
      if (!blocked) routes++;
    }
  }
  
  return routes;
}

function showPossibleMoves() {
  updateAnimations();
  
  let possibleMoves = whitePawn.getPossibleMoves();
  let time = millis() * 0.003;
  
  for (let i = 0; i < possibleMoves.length; i++) {
    let move = possibleMoves[i];
    if (move.x >= 0 && move.x < 8 && move.y >= 0 && move.y < 8) {
      
      // Pixelated pulsing effect
      let pulse = sin(time + i * 0.8) * 0.4 + 0.8;
      let glowIntensity = sin(time * 2 + i) * 50 + 150;
      
      push();
      translate(move.x * 50 + 25, move.y * 50 + 25);
      
      // Outer glow square
      stroke(255, glowIntensity * 0.4);
      strokeWeight(6);
      fill(255, 30);
      let outerSize = 20 * pulse;
      rect(-outerSize/2, -outerSize/2, outerSize, outerSize);
      
      // Inner bright square
      stroke(255, glowIntensity);
      strokeWeight(3);
      fill(200, 100);
      let innerSize = 12 * pulse;
      rect(-innerSize/2, -innerSize/2, innerSize, innerSize);
      
      // Center pixel
      fill(255);
      noStroke();
      rect(-2, -2, 4, 4);
      
      pop();
    }
  }
}

function checkGameOver() {
  if (whitePawn.position.y === 0) {
    isGameOver = true;
    // Victory particles
    createParticles(whitePawn.position, color(255), 25);
    return;
  }
  
  for (let blackPawn of blackPawns) {
    if (blackPawn.position.equals(whitePawn.position)) {
      isGameOver = true;
      return;
    }
  }
  
  let possibleMoves = whitePawn.getPossibleMoves();
  let hasValidMove = false;
  for (let move of possibleMoves) {
    if (move.x >= 0 && move.x < 8 && move.y >= 0 && move.y < 8) {
      hasValidMove = true;
      break;
    }
  }
  if (!hasValidMove) {
    isGameOver = true;
  }
}

function displayGameOver() {
  // Pixelated animated overlay
  let pixelSize = 12;
  let alpha = sin(millis() * 0.004) * 40 + 120;
  
  for (let y = -50; y < 450; y += pixelSize) {
    for (let x = -50; x < 450; x += pixelSize) {
      fill(0, alpha);
      noStroke();
      rect(x, y, pixelSize, pixelSize);
    }
  }
  
  fill(255);
  textAlign(CENTER, CENTER);
  
  // Pixelated glowing text effect
  if (whitePawn.position.y === 0) {
    // Victory text with white glow
    drawPixelGlowText('🎉 YOU WIN! 🎉', 200, 180, 32, color(255));
    drawPixelGlowText('You broke through!', 200, 210, 16, color(220));
  } else {
    // Game over text with dark glow
    drawPixelGlowText('💀 GAME OVER 💀', 200, 180, 32, color(100));
    drawPixelGlowText('The black pawns stopped you!', 200, 210, 16, color(150));
  }
  
  drawPixelGlowText("Click Replay to try again", 200, 240, 14, color(180));
}

function drawPixelGlowText(txt, x, y, size, col) {
  push();
  textAlign(CENTER, CENTER); // Ensure text is always centered
  textSize(size);
  
  // Pixelated glow effect with chunky offset
  let glowSize = 3;
  fill(red(col), green(col), blue(col), 80);
  for (let gx = -glowSize; gx <= glowSize; gx += 2) {
    for (let gy = -glowSize; gy <= glowSize; gy += 2) {
      text(txt, x + gx, y + gy);
    }
  }
  
  // Main text
  fill(col);
  text(txt, x, y);
  pop();
}

function restartGame() {
  // Reset white pawn position on row 7, 5th block (index 4)
  whitePawn.position.set(4, 7);
  whitePawn.displayPosition = createVector(4, 7);
  
  // Reset black pawns - only 4 pawns on BLACK squares in row 0
  blackPawns = [];
  let positions = [1, 3, 5, 7]; // Black squares in row 0
  for (let i = 0; i < 4; i++) {
    let newPawn = new Pawn('black', createVector(positions[i], 0));
    newPawn.displayPosition = createVector(positions[i], 0);
    blackPawns.push(newPawn);
  }
  
  // Reset game state
  isGameOver = false;
  currentTurn = "white";
  blackPawnIndex = 0;
  gameState = "playing";
  
  // Clear all visual effects
  particles = [];
  animatingPawn = null;
  captureEffect = null;
  
  // Reset UI
  replayButton.hide();
  pauseMenu.visible = false;
  gameStartTime = millis();
  
  // Force a redraw to update positions immediately
  redraw();
}

function showTurnIndicator() {
  // Pixelated glowing turn indicator - CENTERED
  let glowIntensity = sin(millis() * 0.008) * 80 + 175;
  fill(255, glowIntensity);
  textSize(16);
  textAlign(CENTER, TOP); // Changed to CENTER
  
  if (currentTurn === "white") {
    drawPixelGlowText("⚡ Your turn - Move diagonally", width/2, 15, 16, color(255));
  } else {
    drawPixelGlowText("🤖 Ultra-smart AI coordinating...", width/2, 15, 16, color(150));
  }
  
  // Game info with pixelated styling - also centered
  textSize(12);
  fill(200);
  textAlign(CENTER, TOP);
  text("Goal: Reach the top row (0) - Diagonal moves on black squares", width/2, height - 45);
  text("Black pawns: " + blackPawns.length + " remaining", width/2, height - 30);
  
  // Game timer - keep in top right
  textAlign(RIGHT, TOP);
  let gameTime = (millis() - gameStartTime) / 1000;
  text("Time: " + gameTime.toFixed(1) + "s", width - 10, 15);
}

class Board {
  constructor() {
    this.cellSize = cellSize; // Use responsive cell size
  }
  
  display() {
    // Fixed pixelated board with black and white theme - NO RANDOM VALUES
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        let isLight = (i + j) % 2 === 0;
        
        // Create pixelated checkerboard with consistent colors
        if (isLight) {
          // Light squares - consistent white
          fill(220);
          stroke(255);
          strokeWeight(max(1, cellSize / 25)); // Responsive stroke
        } else {
          // Dark squares - consistent dark gray/black
          fill(40);
          stroke(0);
          strokeWeight(max(1, cellSize / 25));
        }
        
        rect(i * this.cellSize, j * this.cellSize, this.cellSize, this.cellSize);
        
        // Add pixelated border highlights - NO RANDOM VALUES
        if (isLight) {
          stroke(255);
          strokeWeight(1);
          // Top and left highlight
          line(i * this.cellSize, j * this.cellSize, 
               (i + 1) * this.cellSize, j * this.cellSize);
          line(i * this.cellSize, j * this.cellSize, 
               i * this.cellSize, (j + 1) * this.cellSize);
        } else {
          stroke(0);
          strokeWeight(1);
          // Bottom and right shadow
          line(i * this.cellSize, (j + 1) * this.cellSize, 
               (i + 1) * this.cellSize, (j + 1) * this.cellSize);
          line((i + 1) * this.cellSize, j * this.cellSize, 
               (i + 1) * this.cellSize, (j + 1) * this.cellSize);
        }
      }
    }
  }
}

class HalftoneParticle {
  constructor(x, y, col) {
    this.x = x;
    this.y = y;
    this.vx = random(-2.5, 2.5);
    this.vy = random(-4, -1);
    this.life = 255;
    this.maxLife = 255;
    this.color = col;
    this.size = random(2, 8); // Start with varying dot sizes
    this.dotPattern = floor(random(3)); // Different dot patterns
    this.rotation = 0;
    this.rotationSpeed = random(-0.1, 0.1);
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.12; // gravity
    this.life -= 3;
    this.rotation += this.rotationSpeed;
    
    // Size changes based on life for halftone effect
    let lifeRatio = this.life / this.maxLife;
    this.currentSize = this.size * lifeRatio;
  }
  
  display() {
    if (this.life <= 0) return;
    
    push();
    translate(floor(this.x), floor(this.y)); // Pixel perfect positioning
    rotate(this.rotation);
    
    let alpha = this.life;
    let brightness = red(this.color);
    
    // Create different halftone-style particle effects
    switch(this.dotPattern) {
      case 0:
        // Single dot
        this.drawHalftoneDot(brightness, alpha);
        break;
      case 1:
        // Cluster of small dots
        this.drawDotCluster(brightness, alpha);
        break;
      case 2:
        // Cross pattern
        this.drawCrossPattern(brightness, alpha);
        break;
    }
    
    pop();
  }
  
  drawHalftoneDot(brightness, alpha) {
    // Main halftone dot with rim
    stroke(255, alpha * 0.6);
    strokeWeight(1);
    fill(brightness, alpha);
    ellipse(0, 0, this.currentSize);
    
    // Inner highlight dot
    if (this.currentSize > 3) {
      fill(255, alpha * 0.8);
      noStroke();
      ellipse(-this.currentSize * 0.2, -this.currentSize * 0.2, this.currentSize * 0.4);
    }
  }
  
  drawDotCluster(brightness, alpha) {
    // Multiple small dots in halftone style
    let dotSize = this.currentSize * 0.4;
    
    fill(brightness, alpha);
    stroke(255, alpha * 0.5);
    strokeWeight(1);
    
    // Center dot
    ellipse(0, 0, dotSize);
    
    // Surrounding dots
    if (this.currentSize > 4) {
      ellipse(-dotSize * 0.8, 0, dotSize * 0.7);
      ellipse(dotSize * 0.8, 0, dotSize * 0.7);
      ellipse(0, -dotSize * 0.8, dotSize * 0.7);
      ellipse(0, dotSize * 0.8, dotSize * 0.7);
    }
  }
  
  drawCrossPattern(brightness, alpha) {
    // Cross made of dots (halftone style)
    let dotSize = this.currentSize * 0.3;
    
    fill(brightness, alpha);
    stroke(255, alpha * 0.4);
    strokeWeight(1);
    
    // Horizontal line of dots
    for (let i = -1; i <= 1; i++) {
      ellipse(i * dotSize * 0.8, 0, dotSize);
    }
    
    // Vertical line of dots
    for (let i = -1; i <= 1; i++) {
      ellipse(0, i * dotSize * 0.8, dotSize);
    }
  }
  
  isDead() {
    return this.life <= 0;
  }
}

class PixelParticle {
  constructor(x, y, col) {
    this.x = x;
    this.y = y;
    this.vx = random(-2, 2);
    this.vy = random(-3, -1);
    this.life = 255;
    this.color = col;
    this.size = floor(random(3, 8)); // Chunky pixel sizes
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.1; // gravity
    this.life -= 4;
    
    // Keep size chunky/pixelated
    if (this.life < 128 && this.size > 2) {
      this.size = max(2, this.size - 1);
    }
  }
  
  display() {
    push();
    translate(floor(this.x), floor(this.y)); // Floor for pixel perfect positioning
    
    // Pixelated particle with glow
    stroke(255, this.life * 0.5);
    strokeWeight(1);
    fill(red(this.color), green(this.color), blue(this.color), this.life);
    rect(0, 0, this.size, this.size);
    
    pop();
  }
  
  isDead() {
    return this.life <= 0;
  }
}

class Pawn {
  constructor(color, position) {
    this.color = color;
    this.position = position;
    this.displayPosition = position.copy();
    this.isWhite = color === 'white';
    this.glowIntensity = 0;
  }
  
  display() {
    updateAnimations();
    
    let pos = this.displayPosition || this.position;
    let x = pos.x * cellSize + cellSize/2;
    let y = pos.y * cellSize + cellSize/2;
    
    push();
    translate(x, y);
    
    // Responsive sizing
    let pawnSize = cellSize * 0.7;
    let symbolSize = max(12, cellSize * 0.4);
    
    // Pixelated pawn with black/white theme
    if (this.isWhite) {
      // White pawn with bright glow
      this.glowIntensity = sin(millis() * 0.01) * 60 + 120;
      
      // Outer glow
      if (currentTurn === "white") {
        stroke(255, this.glowIntensity);
        strokeWeight(max(4, cellSize / 8));
        fill(255, 40);
        rect(-pawnSize*0.6, -pawnSize*0.6, pawnSize*1.2, pawnSize*1.2);
      }
      
      // Main white body - pixelated
      stroke(255);
      strokeWeight(max(2, cellSize / 16));
      fill(240);
      rect(-pawnSize*0.5, -pawnSize*0.5, pawnSize, pawnSize);
      
      // Inner highlight
      stroke(255);
      strokeWeight(1);
      fill(255);
      rect(-pawnSize*0.33, -pawnSize*0.33, pawnSize*0.66, pawnSize*0.66);
      
      // Crown symbol - pixelated
      fill(50);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(symbolSize);
      text("♔", 0, 0);
      
    } else {
      // Black pawn with dark outline
      // Outer dark outline
      stroke(0);
      strokeWeight(max(2, cellSize / 12));
      fill(60);
      rect(-pawnSize*0.5, -pawnSize*0.5, pawnSize, pawnSize);
      
      // Main dark body
      stroke(100);
      strokeWeight(max(1, cellSize / 25));
      fill(30);
      rect(-pawnSize*0.4, -pawnSize*0.4, pawnSize*0.8, pawnSize*0.8);
      
      // Dark highlight
      stroke(80);
      strokeWeight(1);
      fill(50);
      rect(-pawnSize*0.27, -pawnSize*0.27, pawnSize*0.54, pawnSize*0.54);
      
      // Pawn symbol - pixelated
      fill(150);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(symbolSize * 0.9);
      text("♟", 0, 0);
    }
    
    pop();
  }
  
  coordinatedMove(battlefieldAnalysis) {
    if (!this.isWhite && this.position.y < 7) {
      let strategy = battlefieldAnalysis.coordinationStrategy;
      
      // Execute ULTRA-SMART strategy-based movement
      switch(strategy) {
        case "INSTANT_CAPTURE":
          return this.executeCapture();
          
        case "LAST_STAND":
          return this.executeLastStand(battlefieldAnalysis);
          
        case "WALL_OF_DEATH":
          return this.executeWallOfDeath(battlefieldAnalysis);
          
        case "TOTAL_SURROUND":
          return this.executeTotalSurround(battlefieldAnalysis);
          
        case "COORDINATED_NET":
          return this.executeCoordinatedNet(battlefieldAnalysis);
          
        case "FORCE_TRAP":
          return this.executeForceTrap(battlefieldAnalysis);
          
        case "CUT_ESCAPE":
          return this.executeCutEscape(battlefieldAnalysis);
          
        case "TERRITORY_CONTROL":
          return this.executeTerritoryControl(battlefieldAnalysis);
          
        default:
          return this.executeAdvance();
      }
    }
    return false;
  }
  
  executeLastStand(analysis) {
    // DESPERATE: White can win next turn - can only move forward
    let whitePawnPos = whitePawn.position;
    
    // Try to move forward to get closer to blocking position
    let forwardMoves = [
      createVector(this.position.x - 1, this.position.y + 1),
      createVector(this.position.x + 1, this.position.y + 1)
    ];
    
    let bestMove = null;
    let shortestDist = Infinity;
    
    for (let move of forwardMoves) {
      if (this.canMoveTo(move)) {
        let distToWhite = abs(move.x - whitePawnPos.x) + abs(move.y - whitePawnPos.y);
        if (distToWhite < shortestDist) {
          shortestDist = distToWhite;
          bestMove = move;
        }
      }
    }
    
    if (bestMove) {
      this.position.x = bestMove.x;
      this.position.y = bestMove.y;
      return true;
    }
    
    return false;
  }
  
  executeWallOfDeath(analysis) {
    // Create a forward-moving wall - black pawns only move forward
    let forwardMoves = [
      createVector(this.position.x - 1, this.position.y + 1),
      createVector(this.position.x + 1, this.position.y + 1)
    ];
    
    // Choose the move that helps form a wall
    let bestMove = null;
    let bestScore = -1;
    
    for (let move of forwardMoves) {
      if (this.canMoveTo(move)) {
        let score = 0;
        
        // Score based on forming a line with other pawns
        for (let otherPawn of blackPawns) {
          if (otherPawn !== this && otherPawn.position.y === move.y) {
            score += 5; // Same row bonus
          }
          if (abs(otherPawn.position.x - move.x) <= 2 && otherPawn.position.y === move.y) {
            score += 3; // Close formation bonus
          }
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
    }
    
    if (bestMove) {
      this.position.x = bestMove.x;
      this.position.y = bestMove.y;
      return true;
    }
    
    return this.executeAdvance();
  }
  
  executeTotalSurround(analysis) {
    // Try to surround by moving forward strategically
    let whitePawnPos = whitePawn.position;
    let forwardMoves = [
      createVector(this.position.x - 1, this.position.y + 1),
      createVector(this.position.x + 1, this.position.y + 1)
    ];
    
    let bestMove = null;
    let bestScore = -1;
    
    for (let move of forwardMoves) {
      if (this.canMoveTo(move)) {
        let score = this.calculateSurroundingEffectiveness(move, whitePawnPos);
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
    }
    
    if (bestMove) {
      this.position.x = bestMove.x;
      this.position.y = bestMove.y;
      return true;
    }
    
    return this.executeAdvance();
  }
  
  executeCoordinatedNet(analysis) {
    // Cast a coordinated net by moving forward strategically
    let whitePawnPos = whitePawn.position;
    let forwardMoves = [
      createVector(this.position.x - 1, this.position.y + 1),
      createVector(this.position.x + 1, this.position.y + 1)
    ];
    
    let bestMove = null;
    let bestScore = -1;
    
    for (let move of forwardMoves) {
      if (this.canMoveTo(move)) {
        let score = this.calculateNetEffectiveness(move, whitePawnPos);
        
        // Bonus for being in white pawn's path
        if (abs(move.x - whitePawnPos.x) <= 1) {
          score += 3;
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
    }
    
    if (bestMove) {
      this.position.x = bestMove.x;
      this.position.y = bestMove.y;
      return true;
    }
    
    return this.executeAdvance();
  }
  
  executeForceTrap(analysis) {
    // Force white into trap by moving forward intelligently
    let whitePawnPos = whitePawn.position;
    let forwardMoves = [
      createVector(this.position.x - 1, this.position.y + 1),
      createVector(this.position.x + 1, this.position.y + 1)
    ];
    
    let bestMove = null;
    let bestScore = -1;
    
    for (let move of forwardMoves) {
      if (this.canMoveTo(move)) {
        let score = 0;
        
        // Higher score for moves that limit white pawn's options
        let distToWhite = abs(move.x - whitePawnPos.x) + abs(move.y - whitePawnPos.y);
        score += (8 - distToWhite); // Closer = better
        
        // Bonus for creating pressure
        if (move.y >= whitePawnPos.y) {
          score += 5; // Getting level or past white pawn
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
    }
    
    if (bestMove) {
      this.position.x = bestMove.x;
      this.position.y = bestMove.y;
      return true;
    }
    
    return this.executeAdvance();
  }
  
  executeCutEscape(analysis) {
    // Cut escape routes by moving forward strategically
    let whitePawnPos = whitePawn.position;
    let forwardMoves = [
      createVector(this.position.x - 1, this.position.y + 1),
      createVector(this.position.x + 1, this.position.y + 1)
    ];
    
    let bestMove = null;
    let bestScore = -1;
    
    for (let move of forwardMoves) {
      if (this.canMoveTo(move)) {
        let score = 0;
        
        // Score for cutting off escape routes
        if (move.x < whitePawnPos.x && whitePawnPos.x <= 3) {
          score += 4; // Cutting off left escape
        }
        if (move.x > whitePawnPos.x && whitePawnPos.x >= 4) {
          score += 4; // Cutting off right escape
        }
        
        // General forward progress bonus
        score += 2;
        
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
    }
    
    if (bestMove) {
      this.position.x = bestMove.x;
      this.position.y = bestMove.y;
      return true;
    }
    
    return this.executeAdvance();
  }
  
  executeTerritoryControl(analysis) {
    // Control territory by moving forward systematically
    let forwardMoves = [
      createVector(this.position.x - 1, this.position.y + 1),
      createVector(this.position.x + 1, this.position.y + 1)
    ];
    
    // Choose the move that creates best territorial control
    let bestMove = null;
    let bestScore = -1;
    
    for (let move of forwardMoves) {
      if (this.canMoveTo(move)) {
        let score = 0;
        
        // Bonus for advancing
        score += 3;
        
        // Bonus for staying in formation with other pawns
        for (let otherPawn of blackPawns) {
          if (otherPawn !== this) {
            let dist = abs(move.x - otherPawn.position.x) + abs(move.y - otherPawn.position.y);
            if (dist <= 3) score += 2; // Formation bonus
          }
        }
        
        // Bonus for controlling center files
        if (move.x >= 2 && move.x <= 5) {
          score += 2;
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
    }
    
    if (bestMove) {
      this.position.x = bestMove.x;
      this.position.y = bestMove.y;
      return true;
    }
    
    return this.executeAdvance();
  }
  
  // Enhanced helper methods
  calculateSurroundingEffectiveness(pos, whitePawnPos) {
    let effectiveness = 0;
    let distance = abs(pos.x - whitePawnPos.x) + abs(pos.y - whitePawnPos.y);
    
    effectiveness += (5 - distance); // Closer = more effective
    if (distance === 2) effectiveness += 3; // Optimal surrounding distance
    if (pos.y <= whitePawnPos.y) effectiveness += 2; // Blocking forward progress
    
    return effectiveness;
  }
  
  calculateNetPositions(whitePawnPos) {
    return [
      createVector(whitePawnPos.x - 2, whitePawnPos.y + 1),
      createVector(whitePawnPos.x + 2, whitePawnPos.y + 1),
      createVector(whitePawnPos.x - 1, whitePawnPos.y + 2),
      createVector(whitePawnPos.x + 1, whitePawnPos.y + 2),
      createVector(whitePawnPos.x, whitePawnPos.y + 3)
    ];
  }
  
  calculateNetEffectiveness(netPos, whitePawnPos) {
    let effectiveness = 0;
    
    // Check how many other pawns support this net position
    for (let otherPawn of blackPawns) {
      if (otherPawn !== this) {
        let dist = abs(netPos.x - otherPawn.position.x) + abs(netPos.y - otherPawn.position.y);
        if (dist <= 3) effectiveness++;
      }
    }
    
    return effectiveness;
  }
  
  calculateTrapSquares(whitePawnPos) {
    // Calculate squares that force white into bad positions
    if (whitePawnPos.x <= 2) {
      // Force toward left edge
      return [
        createVector(whitePawnPos.x + 1, whitePawnPos.y + 1),
        createVector(whitePawnPos.x + 2, whitePawnPos.y)
      ];
    } else if (whitePawnPos.x >= 5) {
      // Force toward right edge
      return [
        createVector(whitePawnPos.x - 1, whitePawnPos.y + 1),
        createVector(whitePawnPos.x - 2, whitePawnPos.y)
      ];
    } else {
      // Force toward edges from center
      return [
        createVector(whitePawnPos.x - 2, whitePawnPos.y + 1),
        createVector(whitePawnPos.x + 2, whitePawnPos.y + 1)
      ];
    }
  }
  
  identifyEscapeRoutes(whitePawnPos) {
    return [
      createVector(whitePawnPos.x - 2, whitePawnPos.y - 2),
      createVector(whitePawnPos.x, whitePawnPos.y - 2),
      createVector(whitePawnPos.x + 2, whitePawnPos.y - 2)
    ];
  }
  
  calculateEscapeBlock(escapeRoute) {
    return createVector(escapeRoute.x, escapeRoute.y + 1);
  }
  
  executeEmergencyBlock(analysis) {
    // CRITICAL: White pawn is 1-2 moves from winning - block at all costs
    let whitePawnPos = whitePawn.position;
    let whitePossibleMoves = whitePawn.getPossibleMoves();
    
    // Try to block white pawn's next possible moves
    for (let whiteMove of whitePossibleMoves) {
      // Calculate positions that could block this move
      let blockingPositions = [
        createVector(whiteMove.x - 1, whiteMove.y - 1),
        createVector(whiteMove.x + 1, whiteMove.y - 1),
        createVector(whiteMove.x, whiteMove.y - 1)
      ];
      
      for (let blockPos of blockingPositions) {
        if (this.canMoveTo(blockPos)) {
          this.position.x = blockPos.x;
          this.position.y = blockPos.y;
          return true;
        }
      }
    }
    
    // If can't block, try to get as close as possible to white pawn
    return this.moveClosestToTarget(whitePawnPos);
  }
  
  executeCoordinatedTrap(analysis) {
    // Set up a coordinated trap with other pawns
    let whitePawnPos = whitePawn.position;
    let trapPositions = this.calculateTrapPositions(whitePawnPos);
    
    // Find the best trap position this pawn can contribute to
    for (let trapPos of trapPositions) {
      if (this.canMoveTo(trapPos)) {
        // Check if other pawns can support this trap
        let supportCount = 0;
        for (let otherPawn of blackPawns) {
          if (otherPawn !== this) {
            let distToTrap = abs(otherPawn.position.x - trapPos.x) + abs(otherPawn.position.y - trapPos.y);
            if (distToTrap <= 3) supportCount++;
          }
        }
        
        if (supportCount >= 1) { // At least one other pawn can support
          this.position.x = trapPos.x;
          this.position.y = trapPos.y;
          return true;
        }
      }
    }
    
    return this.executeSmartHunt(analysis);
  }
  
  executeCornerSqueeze(analysis) {
    // White pawn is in corner - squeeze from the open side
    let whitePawnPos = whitePawn.position;
    let squeezeMoves = [];
    
    if (whitePawnPos.x <= 1) {
      // White is on left side, squeeze from right
      squeezeMoves = [
        createVector(whitePawnPos.x + 1, whitePawnPos.y + 1),
        createVector(whitePawnPos.x + 2, whitePawnPos.y + 1),
        createVector(whitePawnPos.x + 1, whitePawnPos.y + 2)
      ];
    } else if (whitePawnPos.x >= 6) {
      // White is on right side, squeeze from left
      squeezeMoves = [
        createVector(whitePawnPos.x - 1, whitePawnPos.y + 1),
        createVector(whitePawnPos.x - 2, whitePawnPos.y + 1),
        createVector(whitePawnPos.x - 1, whitePawnPos.y + 2)
      ];
    }
    
    for (let move of squeezeMoves) {
      if (this.canMoveTo(move)) {
        this.position.x = move.x;
        this.position.y = move.y;
        return true;
      }
    }
    
    return this.executeAdvance();
  }
  
  executeCenterSurround(analysis) {
    // White pawn is in center - surround from multiple angles
    let whitePawnPos = whitePawn.position;
    let surroundPositions = [
      createVector(whitePawnPos.x - 2, whitePawnPos.y + 1),
      createVector(whitePawnPos.x + 2, whitePawnPos.y + 1),
      createVector(whitePawnPos.x - 1, whitePawnPos.y + 2),
      createVector(whitePawnPos.x + 1, whitePawnPos.y + 2),
      createVector(whitePawnPos.x, whitePawnPos.y + 1)
    ];
    
    // Find the best surrounding position
    let bestMove = null;
    let bestScore = -1;
    
    for (let pos of surroundPositions) {
      if (this.canMoveTo(pos)) {
        let score = this.calculateSurroundScore(pos, whitePawnPos);
        if (score > bestScore) {
          bestScore = score;
          bestMove = pos;
        }
      }
    }
    
    if (bestMove) {
      this.position.x = bestMove.x;
      this.position.y = bestMove.y;
      return true;
    }
    
    return this.executeAdvance();
  }
  
  executeFormationSetup(analysis) {
    // Early game - set up optimal defensive formation
    let optimalPositions = [
      createVector(1, 3), createVector(3, 3), createVector(5, 3), createVector(7, 3), // Front line
      createVector(2, 2), createVector(4, 2), createVector(6, 2) // Support line
    ];
    
    // Find the best formation position for this pawn
    for (let pos of optimalPositions) {
      if (this.canMoveTo(pos) && this.isPositionFree(pos)) {
        this.position.x = pos.x;
        this.position.y = pos.y;
        return true;
      }
    }
    
    return this.executeAdvance();
  }
  
  executeSmartHunt(analysis) {
    // Advanced hunting with predictive movement
    let whitePawnPos = whitePawn.position;
    let whitePossibleMoves = whitePawn.getPossibleMoves();
    
    // Predict where white pawn is most likely to move
    let predictedMove = this.predictWhitePawnMove(whitePossibleMoves);
    
    if (predictedMove) {
      // Move to intercept the predicted position
      let interceptMoves = [
        createVector(predictedMove.x - 1, predictedMove.y + 1),
        createVector(predictedMove.x + 1, predictedMove.y + 1),
        createVector(predictedMove.x, predictedMove.y + 1)
      ];
      
      for (let move of interceptMoves) {
        if (this.canMoveTo(move)) {
          this.position.x = move.x;
          this.position.y = move.y;
          return true;
        }
      }
    }
    
    // Fallback to moving closer to white pawn
    return this.moveClosestToTarget(whitePawnPos);
  }
  
  // Helper methods for smarter AI
  moveClosestToTarget(targetPos) {
    // Move forward only (black pawns restricted to forward movement)
    let forwardMoves = [
      createVector(this.position.x - 1, this.position.y + 1),
      createVector(this.position.x + 1, this.position.y + 1)
    ];
    
    let bestMove = null;
    let shortestDistance = Infinity;
    
    for (let move of forwardMoves) {
      if (this.canMoveTo(move)) {
        let distance = abs(move.x - targetPos.x) + abs(move.y - targetPos.y);
        if (distance < shortestDistance) {
          shortestDistance = distance;
          bestMove = move;
        }
      }
    }
    
    if (bestMove) {
      this.position.x = bestMove.x;
      this.position.y = bestMove.y;
      return true;
    }
    
    return false; // No forward moves available
  }
  
  calculateTrapPositions(whitePawnPos) {
    // Calculate strategic trap positions around white pawn
    return [
      createVector(whitePawnPos.x - 1, whitePawnPos.y + 1),
      createVector(whitePawnPos.x + 1, whitePawnPos.y + 1),
      createVector(whitePawnPos.x - 2, whitePawnPos.y + 1),
      createVector(whitePawnPos.x + 2, whitePawnPos.y + 1),
      createVector(whitePawnPos.x, whitePawnPos.y + 2)
    ];
  }
  
  calculateSurroundScore(pos, whitePawnPos) {
    let score = 0;
    let distance = abs(pos.x - whitePawnPos.x) + abs(pos.y - whitePawnPos.y);
    score += (10 - distance); // Closer = higher score
    
    // Bonus for strategic positions
    if (distance === 2) score += 5; // Optimal distance
    if (pos.y > whitePawnPos.y) score += 3; // Blocking forward movement
    
    return score;
  }
  
  predictWhitePawnMove(whiteMoves) {
    if (whiteMoves.length === 0) return null;
    
    // Simple prediction: white pawn likely moves toward center or away from most black pawns
    let safestMove = null;
    let highestSafety = -1;
    
    for (let move of whiteMoves) {
      let threatCount = 0;
      for (let blackPawn of blackPawns) {
        let distance = abs(move.x - blackPawn.position.x) + abs(move.y - blackPawn.position.y);
        if (distance <= 2) threatCount++;
      }
      
      let safety = 10 - threatCount;
      if (safety > highestSafety) {
        highestSafety = safety;
        safestMove = move;
      }
    }
    
    return safestMove;
  }
  
  isPositionFree(pos) {
    for (let otherPawn of blackPawns) {
      if (otherPawn !== this && otherPawn.position.equals(pos)) {
        return false;
      }
    }
    return true;
  }
  
  executeAggressiveSwarm(analysis) {
    // Aggressive early game - move diagonally toward white pawn on black squares only
    let whitePawnPos = whitePawn.position;
    let bestMove = null;
    let bestScore = -1;
    
    let possibleMoves = [
      createVector(this.position.x - 1, this.position.y + 1), // Down-left
      createVector(this.position.x + 1, this.position.y + 1), // Down-right
      createVector(this.position.x - 1, this.position.y - 1), // Up-left (if needed)
      createVector(this.position.x + 1, this.position.y - 1)  // Up-right (if needed)
    ];
    
    for (let move of possibleMoves) {
      if (this.canMoveTo(move) && this.isBlackSquare(move)) {
        // Score based on distance to white pawn
        let distToWhite = abs(move.x - whitePawnPos.x) + abs(move.y - whitePawnPos.y);
        let score = 20 - distToWhite; // Closer = higher score
        
        // Bonus for moving toward white pawn (downward)
        if (move.y > this.position.y) { // Moving down toward white
          score += 3;
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
    }
    
    if (bestMove) {
      this.position.x = bestMove.x;
      this.position.y = bestMove.y;
      return true;
    }
    
    return this.executeAdvance();
  }
  
  executeCenterControl(analysis) {
    // Control center by moving to block central squares
    let centerSquares = [
      createVector(3, whitePawn.position.y - 1),
      createVector(4, whitePawn.position.y - 1),
      createVector(2, whitePawn.position.y - 1),
      createVector(5, whitePawn.position.y - 1)
    ];
    
    for (let centerSquare of centerSquares) {
      if (this.canMoveTo(centerSquare)) {
        this.position.x = centerSquare.x;
        this.position.y = centerSquare.y;
        return true;
      }
    }
    
    return this.executeAggressiveSwarm(analysis);
  }
  
  executeEdgePressure(analysis) {
    // Push white pawn toward center from edges
    let whitePawnPos = whitePawn.position;
    let targetX;
    
    if (whitePawnPos.x <= 1) {
      // White is on left edge, move to cut off escape
      targetX = whitePawnPos.x + 1;
    } else if (whitePawnPos.x >= 6) {
      // White is on right edge, move to cut off escape
      targetX = whitePawnPos.x - 1;
    } else {
      return this.executeAggressiveSwarm(analysis);
    }
    
    let targetMove = createVector(targetX, this.position.y + 1);
    if (this.canMoveTo(targetMove)) {
      this.position.x = targetMove.x;
      this.position.y = targetMove.y;
      return true;
    }
    
    return this.executeAdvance();
  }
  
  executeFinalDefense(analysis) {
    // Desperate defense - try to body block
    let whitePawnPos = whitePawn.position;
    
    // Try to get directly in front of white pawn
    let blockingMove = createVector(whitePawnPos.x, whitePawnPos.y - 1);
    if (this.canMoveTo(blockingMove)) {
      this.position.x = blockingMove.x;
      this.position.y = blockingMove.y;
      return true;
    }
    
    // Try diagonal blocking
    let diagonalBlocks = [
      createVector(whitePawnPos.x - 1, whitePawnPos.y - 1),
      createVector(whitePawnPos.x + 1, whitePawnPos.y - 1)
    ];
    
    for (let block of diagonalBlocks) {
      if (this.canMoveTo(block)) {
        this.position.x = block.x;
        this.position.y = block.y;
        return true;
      }
    }
    
    return this.executeAdvance();
  }
  
  executeSmartCoordination(analysis) {
    // Enhanced coordination with predictive movement
    let whitePawnPos = whitePawn.position;
    let bestMove = null;
    let bestScore = -1;
    
    // Predict where white pawn might move next
    let whitePossibleMoves = whitePawn.getPossibleMoves();
    
    let possibleMoves = [
      createVector(this.position.x, this.position.y + 1),
      createVector(this.position.x - 1, this.position.y + 1),
      createVector(this.position.x + 1, this.position.y + 1),
      createVector(this.position.x - 1, this.position.y),
      createVector(this.position.x + 1, this.position.y)
    ];
    
    for (let move of possibleMoves) {
      if (this.canMoveTo(move)) {
        let score = 0;
        
        // Score based on blocking potential white moves
        for (let whiteMove of whitePossibleMoves) {
          let distToWhiteMove = abs(move.x - whiteMove.x) + abs(move.y - whiteMove.y);
          if (distToWhiteMove <= 2) score += 3;
        }
        
        // Bonus for team coordination
        for (let otherPawn of blackPawns) {
          if (otherPawn !== this) {
            let dist = abs(move.x - otherPawn.position.x) + abs(move.y - otherPawn.position.y);
            if (dist <= 2) score += 2;
          }
        }
        
        // Bonus for forward progress
        score += (8 - move.y);
        
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
    }
    
    if (bestMove) {
      this.position.x = bestMove.x;
      this.position.y = bestMove.y;
      return true;
    }
    
    return this.executeAdvance();
  }
  
  executeCapture() {
    let captureMove = this.checkForCapture();
    if (captureMove) {
      this.position.x = captureMove.x;
      this.position.y = captureMove.y;
      return true;
    }
    return false;
  }
  
  executeAggressiveBlock(analysis) {
    let bestBlockingPos = this.findBestBlockingPosition(analysis.blockingPositions);
    if (bestBlockingPos && this.canMoveTo(bestBlockingPos)) {
      this.position.x = bestBlockingPos.x;
      this.position.y = bestBlockingPos.y;
      return true;
    }
    return this.executeAdvance();
  }
  
  executeDefensiveWall(analysis) {
    let wallPosition = this.findBestWallPosition(analysis);
    if (wallPosition && this.canMoveTo(wallPosition)) {
      this.position.x = wallPosition.x;
      this.position.y = wallPosition.y;
      return true;
    }
    return this.executeAdvance();
  }
  
  executeCloseGaps(analysis) {
    let gapToClose = this.findNearestGap(analysis.formationGaps);
    if (gapToClose && this.canMoveTo(gapToClose)) {
      this.position.x = gapToClose.x;
      this.position.y = gapToClose.y;
      return true;
    }
    return this.executeAdvance();
  }
  
  executeAdvance() {
    // Black pawns can ONLY move diagonally forward (down the board)
    let forwardMoves = [
      createVector(this.position.x - 1, this.position.y + 1), // Down-left
      createVector(this.position.x + 1, this.position.y + 1)  // Down-right
    ];
    
    // Try forward diagonal moves on black squares only
    for (let move of forwardMoves) {
      if (this.canMoveTo(move) && this.isBlackSquare(move)) {
        this.position.x = move.x;
        this.position.y = move.y;
        return true;
      }
    }
    
    return false;
  }
  
  executeStandardMove(analysis) {
    let captureMove = this.checkForCapture();
    if (captureMove) {
      this.position.x = captureMove.x;
      this.position.y = captureMove.y;
      return true;
    }
    
    let coordinatedMove = this.getCoordinatedMove(analysis);
    if (coordinatedMove) {
      this.position.x = coordinatedMove.x;
      this.position.y = coordinatedMove.y;
      return true;
    }
    
    return this.executeAdvance();
  }
  
  checkForCapture() {
    // Check if white pawn is diagonally adjacent in FORWARD direction (can be captured)
    // Black pawns move forward (down), so they capture diagonally forward
    let forwardCaptureMoves = [
      createVector(this.position.x - 1, this.position.y + 1), // Down-left capture
      createVector(this.position.x + 1, this.position.y + 1)  // Down-right capture
    ];
    
    for (let move of forwardCaptureMoves) {
      if (whitePawn.position.equals(move) && this.isBlackSquare(move)) {
        return move;
      }
    }
    
    return null; // No capture available
  }
  
  isBlackSquare(pos) {
    // Check if position is a black square (sum of coordinates is odd)
    return (pos.x + pos.y) % 2 === 1;
  }
  
  findBestBlockingPosition(blockingPositions) {
    for (let blockData of blockingPositions) {
      let pos = blockData.position;
      if (this.canReachPosition(pos)) {
        return pos;
      }
    }
    return null;
  }
  
  findBestWallPosition(analysis) {
    let currentPos = this.position;
    let bestPos = null;
    let bestScore = -1;
    
    let possibleMoves = [
      createVector(currentPos.x, currentPos.y + 1),
      createVector(currentPos.x - 1, currentPos.y + 1),
      createVector(currentPos.x + 1, currentPos.y + 1),
      createVector(currentPos.x - 1, currentPos.y),
      createVector(currentPos.x + 1, currentPos.y)
    ];
    
    for (let move of possibleMoves) {
      if (this.canMoveTo(move)) {
        let score = this.calculateWallScore(move, analysis);
        if (score > bestScore) {
          bestScore = score;
          bestPos = move;
        }
      }
    }
    
    return bestPos;
  }
  
  calculateWallScore(position, analysis) {
    let score = 0;
    
    for (let otherPawn of blackPawns) {
      if (otherPawn !== this) {
        let distance = abs(position.x - otherPawn.position.x) + abs(position.y - otherPawn.position.y);
        if (distance <= 2) score += 5;
        if (distance === 1) score += 3;
      }
    }
    
    if (abs(position.x - whitePawn.position.x) <= 1) score += 4;
    
    return score;
  }
  
  findNearestGap(gaps) {
    let currentPos = this.position;
    let nearestGap = null;
    let shortestDistance = Infinity;
    
    for (let gap of gaps) {
      let distance = abs(gap.x - currentPos.x) + abs(gap.y - currentPos.y);
      if (distance < shortestDistance && this.canReachPosition(gap)) {
        shortestDistance = distance;
        nearestGap = gap;
      }
    }
    
    return nearestGap;
  }
  
  getCoordinatedMove(analysis) {
    let possibleMoves = [];
    
    let moves = [
      createVector(this.position.x - 1, this.position.y + 1),
      createVector(this.position.x + 1, this.position.y + 1),
      createVector(this.position.x, this.position.y + 1)
    ];
    
    for (let move of moves) {
      if (this.canMoveTo(move)) {
        let score = this.calculateCoordinationScore(move, analysis);
        possibleMoves.push({move: move, score: score});
      }
    }
    
    if (possibleMoves.length > 0) {
      possibleMoves.sort((a, b) => b.score - a.score);
      return possibleMoves[0].move;
    }
    
    return null;
  }
  
  calculateCoordinationScore(position, analysis) {
    let score = this.calculateBlockingScore(position);
    
    let formationBonus = 0;
    for (let otherPawn of blackPawns) {
      if (otherPawn !== this) {
        let distance = abs(position.x - otherPawn.position.x) + abs(position.y - otherPawn.position.y);
        if (distance <= 2) formationBonus += 2;
      }
    }
    score += formationBonus;
    
    for (let gap of analysis.formationGaps) {
      if (position.equals(gap)) {
        score += 8;
      }
    }
    
    return score;
  }
  
  calculateBlockingScore(position) {
    let score = 0;
    
    let distanceToWhite = abs(position.x - whitePawn.position.x) + abs(position.y - whitePawn.position.y);
    score += (10 - distanceToWhite);
    
    if (abs(position.x - whitePawn.position.x) === abs(position.y - whitePawn.position.y)) {
      score += 5;
    }
    
    score += (8 - position.y);
    
    return score;
  }
  
  canReachPosition(targetPos) {
    let currentPos = this.position;
    let xDiff = targetPos.x - currentPos.x;
    let yDiff = targetPos.y - currentPos.y;
    
    if (yDiff < 0) return false;
    if (abs(xDiff) > yDiff) return false;
    
    return true;
  }
  
  canMoveTo(targetPos) {
    // Check if this pawn can move to the target position in one move
    if (!this.isValidPosition(targetPos)) return false;
    if (!this.isBlackSquare(targetPos)) return false; // Must be on black square
    
    let currentPos = this.position;
    let xDiff = abs(targetPos.x - currentPos.x);
    let yDiff = abs(targetPos.y - currentPos.y);
    
    // Valid moves: only diagonal (both x and y change by 1)
    if (xDiff === 1 && yDiff === 1) return true;
    
    return false;
  }
  
  isValidPosition(pos) {
    if (pos.x < 0 || pos.x >= 8 || pos.y < 0 || pos.y >= 8) {
      return false;
    }
    
    for (let other of blackPawns) {
      if (other !== this && other.position.equals(pos)) {
        return false;
      }
    }
    
    if (whitePawn.position.equals(pos)) {
      return false;
    }
    
    return true;
  }
  
  getPossibleMoves() {
    let moves = [];
    if (this.isWhite) {
      // White pawn can move diagonally in all 4 directions (but still restricted to black squares)
      let allDiagonalMoves = [
        createVector(this.position.x - 1, this.position.y - 1), // Up-left (toward goal)
        createVector(this.position.x + 1, this.position.y - 1), // Up-right (toward goal)
        createVector(this.position.x - 1, this.position.y + 1), // Down-left (retreat)
        createVector(this.position.x + 1, this.position.y + 1)  // Down-right (retreat)
      ];
      
      // Only include moves that are on black squares and within bounds
      for (let move of allDiagonalMoves) {
        if (move.x >= 0 && move.x < 8 && move.y >= 0 && move.y < 8) {
          // Check if it's a black square (sum of coordinates is odd)
          if ((move.x + move.y) % 2 === 1) {
            moves.push(move);
          }
        }
      }
    }
    return moves;
  }
  
  isValidMove(target) {
    if (this.isWhite) {
      let possibleMoves = this.getPossibleMoves();
      for (let move of possibleMoves) {
        if (move.equals(target)) {
          let hasBlackPawn = false;
          for (let blackPawn of blackPawns) {
            if (blackPawn.position.equals(target)) {
              hasBlackPawn = true;
              break;
            }
          }
          return true;
        }
      }
    }
    return false;
  }
  
  moveTo(target) {
    this.position = target.copy();
    this.displayPosition = target.copy();
  }
}

function windowResized() {
  let canvasSize = min(windowWidth - 20, windowHeight - 100, 500);
  resizeCanvas(canvasSize, canvasSize);
  boardSize = canvasSize - 100;
  cellSize = boardSize / 8;
  boardOffsetX = (width - boardSize) / 2;
  boardOffsetY = (height - boardSize) / 2;
  if (typeof replayButton !== 'undefined' && replayButton.position) {
    replayButton.position(width - 100, height + 20);
  }
  if (typeof menuButton !== 'undefined' && menuButton.position) {
    menuButton.position(width - 60, 20);
  }
}