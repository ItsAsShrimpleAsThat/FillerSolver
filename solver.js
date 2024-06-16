const canvas = document.getElementById("colorcanvas");
const ctx = canvas.getContext("2d");

canvas.width = 768
canvas.height = 600

const backgroundColor = "rgb(200, 200, 200)"
ctx.fillStyle = backgroundColor;
ctx.fillRect(0, 0, canvas.width, canvas.height);

const squareSize = 65;
const leftOffset = canvas.width / 2 - (squareSize * 4) 
const topMargin = 20;

const clickX2canvasX = 384 * 2/512;
const clickY2canvasY = 300 * 2/400;

const unfill = 0;
const red = 1;
const green = 2;
const yellow = 3;
const blue = 4;
const purple = 5;
const black = 6;
const myCaptured = 7;
const oppCaptured = 8

const colors = ["rgb(255, 255, 255)", "rgb(234, 93, 110)", "rgb(150, 186, 88)", "rgb(219, 198, 70)", 
                                      "rgb(77, 145, 208)", "rgb(90, 67, 139)", "rgb(65, 65, 65)", 
                                      "rgb(255, 138, 185)", "rgb(138, 222, 255)"];
const selectorGap = 30;
const selectorDistFromTop = 505;
const selectedBoxSizeDiff = 16; //MUST BE EVEN NUMBER TO PREVENT VISUAL BUGS

let selectedColor = 0;

let currentGame = [[0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0],
                   [0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0]];

let searchGame = [];
let searchTurn = true;
let doSearch = true;
let myTerritory = [];
let oppTerritory = [];
let myColor = unfill;
let oppColor = unfill;

let boxes = [];
let previousSelectedBox = -1;

const myTurnCheckbox = document.getElementById("mebox");
const oppTurnCheckbox = document.getElementById("opponentbox");
const depthInputField = document.getElementById("depthinput");
const infiniteDepthSelector = document.getElementById("infinitedepth");
const goButton = document.getElementById("gobutton");
const stopButton = document.getElementById("stopbutton");
const iterDeepeningCheckbox = document.getElementById("iterdeep");
const quiescenceSearchCheckbox = document.getElementById("quiescence");
const quiLimitInputField = document.getElementById("quidepth");

let useIterativeDeeping = iterDeepeningCheckbox.checked;

let numPositionsSearched = 0;
let numQuiescencePositionsSearched = 0;
let numNodes = 0;
let numQuiNodes = 0;
const stat_numPos = document.getElementById("numSearchedPos");
const stat_numPosQui = document.getElementById("numQuiSearchedPos");
const stat_numNodes = document.getElementById("numNodes");
const stat_numQuiNodes = document.getElementById("numQuiNodes");
const result_color = document.getElementById("resultsquare");
const result_turn = document.getElementById("resultturntext");

function updateStats()
{
    stat_numPos.innerHTML = "Num Searched Positions: " + numPositionsSearched;
    stat_numPosQui.innerHTML = "Num Searched Pos (Quiescence search): " + numQuiescencePositionsSearched;
    stat_numNodes.innerHTML = "Num Nodes: " + numNodes;
    stat_numQuiNodes.innerHTML = "Num Nodes (Quiescence search): " + numQuiNodes;
    result_color.style.backgroundColor = colors[bestTurn.selectedColor];
    result_turn.innerHTML = searchTurn ? "for me" : "for my opponent"
}

function drawGrid()
{
    for(let x = 0; x < 8; x++)
    {
        for(let y = 0; y < 7; y++)
        {
            ctx.fillStyle = "rgb(0, 0, 0)";
            ctx.strokeRect(leftOffset + (x * squareSize), y * squareSize + topMargin, squareSize,  squareSize);  
        }
    }
}

drawGrid();

for(let i = 1; i < 7; i++)
{
    ctx.fillStyle = colors[i];
    //crazy calculation to find where the fill rectangles need to go
    let boxX = canvas.width / 2  + (selectorGap + squareSize) * (i-4) + selectorGap/2;
    ctx.fillRect(boxX, selectorDistFromTop, squareSize, squareSize);
    boxes.push([boxX, i]);
}

function mouseInBox(mx, my, x1, y1, x2, y2)
{
    return mx > x1 && mx < x2 && my > y1 && my < y2;
}

function getMouseBox(mx, my)
{
    for(let i = 1; i < 7; i++)
    {
        let currentBoxX = boxes[i - 1][0]; 
        if(mouseInBox(mx, my, currentBoxX, selectorDistFromTop, currentBoxX + squareSize, selectorDistFromTop + squareSize))
        {
            let boxNum = boxes[i - 1][1];
            console.log("Selection Box Clicked, box #" + boxNum);
            return boxNum;
        }
    }
    return -1;
}

function screenCoord2gridCoord(mx, my)
{
    if(mx >= leftOffset && mx <= canvas.width - leftOffset)
    {
        if(my >= topMargin && my <= 7 * squareSize + topMargin)
        {
            return [Math.floor((mx - leftOffset) / squareSize), Math.floor((my - topMargin) / squareSize)];
        }
    }
}

class Turn
{
    constructor(capturedThisTurn, selectedColor, previousColor)
    {
        this.capturedThisTurn = capturedThisTurn;
        this.selectedColor = selectedColor;
        this.previousColor = previousColor;
    }
}

function sum2Length(arr1, arr2)
{
    return [arr1[0] + arr2[0], arr1[1] + arr2[1]];
}

function arraysEqual(a, b)
{
    for (let i = 0; i < a.length; i++) 
    {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

function arrayContainsArray(array, target)
{
    for (let i = 0; i < array.length; i++) 
    {
        if (arraysEqual(array[i], target)) return true;
    }
    return false;
}

const offsets = [[0, 1], [0, -1], [1, 0], [-1, 0]];
//generateQuietMoves is set to false when we only want to search positions that have high-value captures.
//This is used in the quiescence search.
function generateTurns(meToMove, generateQuietMoves)
{
    let workingTerritory = meToMove ? myTerritory : oppTerritory;
    let generatedTurns = [[], [], [], [], [], []];
    let maxCaps = 0;

    for(let i = 0; i < workingTerritory.length; i++)
    {
        for(let direction = 0; direction < 4; direction++)
        {
            let coordToCheck = sum2Length(workingTerritory[i], offsets[direction]);
            
            if(!arrayContainsArray(workingTerritory, coordToCheck))
            {
                //using old function lmao
                if(mouseInBox(coordToCheck[0], coordToCheck[1], -1, -1, 8, 7))
                {
                    let color = searchGame[coordToCheck[0]][coordToCheck[1]] - 1;

                    if(color + 1 != myColor && color + 1 != oppColor && color < 6)
                    {
                        if(!arrayContainsArray(generatedTurns[color], coordToCheck))
                        {
                            generatedTurns[color].push(coordToCheck);
                            if(generatedTurns[color].length > maxCaps)
                            {
                                maxCaps = generatedTurns[color].length;
                            }
                        }
                    }
                }
            }
        }
    }
    
    let turnsArray = [];
    //filter for any colors that have no moves
    for(let i = 0; i < 6; i++)
    {
        if(generateQuietMoves) //if number of moves > 0, add move to list
        {
            if(generatedTurns[i].length == 0)
            {
                continue;
            }
            numNodes++;
        }
        else //only add if the move is not quiet
        {
            if(maxCaps < Math.min(workingTerritory.length * 0.5, 3))
            {
                continue;
            }
            numQuiNodes++;
        }

        turnsArray.push(new Turn(generatedTurns[i], i + 1, searchTurn ? myColor : oppColor));
    }
    return turnsArray;
}

function generateNoCapsTurns()
{
    let turnsArray = [];
    for(let i = 1; i < 7; i++)
    {
        if(i != myColor && i != oppColor )
        {
            turnsArray.push(new Turn([], i, searchTurn ? myColor : oppColor))
        }
    }
    return turnsArray;
}

function removeArrayFromArray(array, filter)
{
    let newArray = [];

    for(let i = 0; i < array.length; i++)
    {
        if(!arraysEqual(array[i], filter)) { newArray.push(array[i]); }
    }

    return newArray;
}

let bestTurnInLastIterativeDeepeningSearch = new Turn([], 0, 10);

function orderMoves(moves)
{
    moves.sort((a, b) => b.capturedThisTurn.length - a.capturedThisTurn.length);

    if(useIterativeDeeping)
    {
        if(bestTurnInLastIterativeDeepeningSearch.previousColor != 10) //check to make sure this isnt depth = 1
        {
            for(let i = 0; i < moves.length; i++)
            {
                if(moves[i] == bestTurnInLastIterativeDeepeningSearch)
                {
                    let temp = moves[0];
                    moves[0] = moves[i]
                    moves[i] = temp;
                }
            }
        }
    }
    return moves;
}

function makeTurn(turn, meToMove)
{
    let turnCaps = turn.capturedThisTurn;
    for(let i = 0; i < turnCaps.length; i++)
    {
        //capture the squares
        let currentCoord = turnCaps[i];
        searchGame[currentCoord[0]][currentCoord[1]] = meToMove ? myCaptured : oppCaptured;
        if(meToMove) { myTerritory.push(currentCoord); }
        else { oppTerritory.push(currentCoord); }
    }
    if(meToMove) { myColor = turn.selectedColor; }
    else { oppColor = turn.selectedColor; }
}

function unmakeTurn(turn, meToMove)
{
    let turnCaps = turn.capturedThisTurn;
    for(let i = 0; i < turnCaps.length; i++)
    {
        //set squares back to original colors
        let currentCoord = turnCaps[i];
        searchGame[currentCoord[0]][currentCoord[1]] = turn.selectedColor;
        if(meToMove) { myTerritory = removeArrayFromArray(myTerritory, currentCoord); }
        else { oppTerritory = removeArrayFromArray(oppTerritory, currentCoord); }
    }
    if(meToMove) { myColor = turn.previousColor; }
    else { oppColor = turn.previousColor; }
}

//evaluation function evaluating...
//# of cells captured
//number of cells touching?
function evaluate(game)
{
    let myCells = myTerritory.length;
    let oppCells = oppTerritory.length;

    let eval = myCells - oppCells;
    let perspective = searchTurn ? 1 : -1;

    return eval * perspective;
}

let bestTurn = new Turn([], 0, 0);
let previousBestEvalutaion = -99999;
function search(depth, alpha, beta, doQuiescenceSearch)
{
    numPositionsSearched++;

    if(!doSearch)
    {
        return 0;
    }

    //detect win or locked positions
    
    if(depth == 0)
    {
        if(doQuiescenceSearch)
        {
            return quiescenceSearch(quiLimitInputField.value, alpha, beta)
        }
        else
        {
            return evaluate(searchGame); 
        }
    }

    if(myTerritory.length > 28) //if over half the board is mine, we have won the game
    {
        return 999999 * searchTurn ? 1 : -1; 
    }
    if(oppTerritory.length > 28) //likewise, if over half the board is the opponent's, the opponent has won
    {
        return -999999 * searchTurn ? 1 : -1
    }

    let searchTurns = generateTurns(searchTurn, true);
    searchTurns = orderMoves(searchTurns);

    if(searchTurns.length == 0)
    {
        searchTurns = generateNoCapsTurns(); //No legal turn will capture any squares, so just play a random color
    }
    
    for(let i = 0; i < searchTurns.length; i++)
    {
        makeTurn(searchTurns[i], searchTurn);
        searchTurn = !searchTurn;

        //recursive search
        let eval = -search(depth - 1, -alpha, -beta, doQuiescenceSearch);

        searchTurn = !searchTurn;
        unmakeTurn(searchTurns[i], searchTurn);

        if(eval > alpha)
        {
            bestTurn = searchTurns[i];
            alpha = eval;
        }

        if(alpha >= beta)
        {
            return beta;
        }
    }

    return alpha;
}

function quiescenceSearch(depth, alpha, beta)
{
    numQuiescencePositionsSearched++;

    if(!doSearch)
    {
        return 0;
    }

    //detect win or locked positions
    
    if(depth == 0)
    {
        return evaluate(searchGame);
    }

    if(myTerritory.length > 28) //if over half the board is mine, we have won the game
    {
        return 999999 * searchTurn ? 1 : -1; 
    }
    if(oppTerritory.length > 28) //likewise, if over half the board is the opponent's, the opponent has won
    {
        return -999999 * searchTurn ? 1 : -1
    }

    //TODO: Delta pruning

    let searchTurns = generateTurns(searchTurn, false);
    searchTurns = orderMoves(searchTurns);
    
    if(searchTurns.length == 0)
    {
        return evaluate(searchGame); //unlike in our regular search, if there are no legal captures, we just end the search
    }

    for(let i = 0; i < searchTurns.length; i++)
    {
        makeTurn(searchTurns[i], searchTurn);
        searchTurn = !searchTurn;

        //recursive search
        let eval = -quiescenceSearch(depth - 1, -alpha, -beta);

        searchTurn = !searchTurn;
        unmakeTurn(searchTurns[i], searchTurn);

        if(eval > alpha)
        {
            bestTurn = searchTurns[i];
            alpha = eval;
        }

        if(alpha >= beta)
        {
            return beta;
        }
    }

    return alpha;
}

function getNeigbors(coord)
{
    let neighbors = [];

    for(let direction = 0; direction < 4; direction++)
    {
        let checkingCoord = sum2Length(coord, offsets[direction])
        
        if(mouseInBox(checkingCoord[0], checkingCoord[1], -1, -1, 8, 7))
        {
            neighbors.push(checkingCoord);
        }
    }
    return neighbors;
}

function coordinateTo56(coord)
{
    return coord[1] * 8 + coord[0];
}

//non recursive implementation of breadth first search
function findTerritory(startingCoord)
{
    let queue = [];
    let visited = new Array(56).fill(false);
    const color = searchGame[startingCoord[0]][startingCoord[1]];
    console.log(color);

    visited[coordinateTo56(startingCoord)] = true;
    queue.push(startingCoord);
    
    while (queue.length > 0) {
        let neighbors =  getNeigbors(queue.shift());
        for (let neighbor of neighbors) 
        {
            coord56 = coordinateTo56(neighbor);
            if (!visited[coord56]) 
            {
                if(searchGame[neighbor[0]][neighbor[1]] == color)
                {
                    console.log(searchGame[neighbor[0]][neighbor[1]])
                    visited[coord56] = true;
                    queue.push(neighbor);
                }
            }
        }
    }
    
    //get all visited nodes
    let territory = [];
    for(let x = 0; x < 8; x++)
    {
        for(let y = 0; y < 7; y++)
        {
            if(visited[coordinateTo56([x, y])])
            {
                territory.push([x, y]);
            }
        }
    }
    return territory;
}

function startSearch()
{
    //set game variables
    searchGame = currentGame;
    searchTurn = myTurnCheckbox.checked;
    myTerritory = findTerritory([0, 6]);
    oppTerritory = findTerritory([7, 0]);

    //reset search variables
    bestTurn = new Turn([], 0, 0);
    previousBestEvalutaion = -99999;

    goButton.disabled = true;
    stopButton.disabled = false;
    depthInputField.disabled = true;
    infiniteDepthSelector.disabled = true;
    myTurnCheckbox.disabled = true;
    oppTurnCheckbox.disabled = true;
    iterDeepeningCheckbox.disabled = true;
    quiescenceSearchCheckbox.disabled = true;
    quiLimitInputField.disabled = true;

    useIterativeDeeping = iterDeepeningCheckbox.checked;
    bestTurnInLastIterativeDeepeningSearch = new Turn([], 0, 10);

    myColor = searchGame[0][6];
    oppColor = searchGame[7][0];

    console.log(myTerritory);
    console.log(oppTerritory);

    if(infiniteDepthSelector.checked)
    {
        //solve
    }
    else
    {
        if(useIterativeDeeping)
        {
            //use iterative deepening
        }
        else
        {
            //standard search until fixed depth
            search(depthInputField.value, -99999, 99999, quiescenceSearchCheckbox.checked);
            updateStats();
        }
    }

    console.log(bestTurn);
}

function clickEvent(canvas, event) {
    const rect = canvas.getBoundingClientRect()
    let x = (event.clientX - rect.left) * clickX2canvasX;
    let y = (event.clientY - rect.top) * clickY2canvasY;

    clickedBox = getMouseBox(x, y);
    if(clickedBox != -1)
    {
        selectedColor = clickedBox;

        let selectedBoxX = canvas.width / 2  + (selectorGap + squareSize) * (clickedBox-4) + selectorGap/2;

        //brings previous selected box's size back to normal
        if(previousSelectedBox != -1)
        {
            let previousX = canvas.width / 2  + (selectorGap + squareSize) * (previousSelectedBox-4) + selectorGap/2;
            
            //Remove old fill
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(previousX - selectedBoxSizeDiff / 2, selectorDistFromTop - selectedBoxSizeDiff / 2, squareSize + selectedBoxSizeDiff, squareSize + selectedBoxSizeDiff);
            
            //draw new fill on top
            ctx.fillStyle = colors[previousSelectedBox];
            ctx.fillRect(previousX, selectorDistFromTop, squareSize, squareSize);
        }

        ctx.fillStyle = colors[clickedBox];
        ctx.fillRect(selectedBoxX - selectedBoxSizeDiff / 2, selectorDistFromTop - selectedBoxSizeDiff / 2, squareSize + selectedBoxSizeDiff, squareSize + selectedBoxSizeDiff);

        previousSelectedBox = clickedBox;
    }
    else
    {
        if(selectedColor != 0)
        {
            let gridCoord = screenCoord2gridCoord(x, y);

            if(gridCoord != null)
            {
                ctx.fillStyle = colors[selectedColor];
                ctx.fillRect(leftOffset + (gridCoord[0] * squareSize), gridCoord[1] * squareSize + topMargin, squareSize,  squareSize);  
                currentGame[gridCoord[0]][gridCoord[1]] = selectedColor;
            }
        }
    }
}

canvas.addEventListener('mousedown', function(e) {
    clickEvent(canvas, e);
});

goButton.addEventListener("click", startSearch);

myTurnCheckbox.addEventListener("change", function(){
    oppTurnCheckbox.checked = !myTurnCheckbox.checked;
});

oppTurnCheckbox.addEventListener("change", function(){
    myTurnCheckbox.checked = !oppTurnCheckbox.checked;
});

infiniteDepthSelector.addEventListener("change", function(){
    depthInputField.disabled = infiniteDepthSelector.checked; 
});

//-----SAVE/LOAD CODE-----//

function gameToString()
{
    let savedString = "";

    for(let x = 0; x < 8; x++)
    {
        for(let y = 0; y < 7; y++)
        {
            savedString += currentGame[x][y];
        }
        
        if(x != 7)
        {
            savedString += " ";
        }
    }
    return savedString;
}

function stringToGame(gameToLoad)
{
    let loadedGame = [];

    const splitted = gameToLoad.split(" ");
    for(let i = 0; i < splitted.length; i++)
    {
        loadedGame.push(splitted[i].split(""));
    }

    return loadedGame;
}

const savedGameCanvas = document.getElementById("savedColor");
const svctx = savedGameCanvas.getContext("2d");

savedGameCanvas.width = 400;
savedGameCanvas.height = 340;

svctx.fillStyle = "rgb(200, 200, 200)";
svctx.fillRect(0, 0, savedGameCanvas.width, savedGameCanvas.height);    

const sv_squareSize = 42;
const sv_leftOffset = savedGameCanvas.width / 2 - (sv_squareSize * 4) 
const sv_topMargin = 23;

function drawSavedGame(game)
{
    svctx.fillStyle = "rgb(200, 200, 200)";
    svctx.fillRect(0, 0, savedGameCanvas.width, savedGameCanvas.height);    
    for(let x = 0; x < 8; x++)
    {
        for(let y = 0; y < 7; y++)
        {
            if(game[x][y] == unfill)
            {
                svctx.fillStyle = "rgb(0, 0, 0)";
                svctx.strokeRect(sv_leftOffset + (x * sv_squareSize), y * sv_squareSize + sv_topMargin, sv_squareSize,  sv_squareSize);  
            }
            else
            {
                svctx.fillStyle = colors[game[x][y]];
                svctx.fillRect(sv_leftOffset + (x * sv_squareSize), y * sv_squareSize + sv_topMargin, sv_squareSize,  sv_squareSize);
            }
        }
    }
}

function getGameArrayToDraw()
{
    const item = localStorage.getItem("save");
    if(item == "undefined" || item == null)
    {
        return Array(8).fill(Array(7).fill(unfill));
    }
    else
    {
        return stringToGame(localStorage.getItem("save"));
    }
}

const deleteButton = document.getElementById("delbutton");
deleteButton.addEventListener("click", function(){
    localStorage.removeItem("save");
    drawSavedGame(getGameArrayToDraw());
});

drawSavedGame(getGameArrayToDraw());

const saveButton = document.getElementById("savebutton");
const loadButton = document.getElementById("loadbutton");

saveButton.addEventListener("click", function(){
    localStorage.setItem("save", gameToString());
    drawSavedGame(stringToGame(localStorage.getItem("save")));
});

loadButton.addEventListener("click", function(){
    //reset screen
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, 490);
    drawGrid();

    const item = localStorage.getItem("save");
    if(item == "undefined" || item == null)
    {
        currentGame = Array(8).fill(Array(7).fill(unfill));
        return
    }
    currentGame = stringToGame(localStorage.getItem("save"));

    for(let x = 0; x < 8; x++)
    {
        for(let y = 0; y < 7; y++)
        {
            if(currentGame[x][y] != unfill)
            {
                ctx.fillStyle = colors[currentGame[x][y]];
                ctx.fillRect(leftOffset + (x * squareSize), y * squareSize + topMargin, squareSize,  squareSize); 
            }
        }
    }
})