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
                                      "rgb(77, 145, 208)", "rgb(90, 67, 139)", "rgb(65, 65, 65)"];
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

for(let x = 0; x < 8; x++)
{
    for(let y = 0; y < 7; y++)
    {
        ctx.fillStyle = "rgb(0, 0, 0)";
        ctx.strokeRect(leftOffset + (x * squareSize), y * squareSize + topMargin, squareSize,  squareSize);  
    }
}

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
    constructor(capturedThisTurn, selectedColor)
    {
        this.capturedThisTurn = capturedThisTurn;
        this.selectedColor = selectedColor
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
function generateTurns(meToMove)
{
    let workingTerritory = meToMove ? myTerritory : oppTerritory;
    let generatedTurns = [[], [], [], [], [], []];

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

                    if(color + 1 != myColor && color + 1 != oppColor)
                    {
                        if(!arrayContainsArray(generatedTurns[color], coordToCheck))
                        {
                            generatedTurns[color].push(coordToCheck);
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
        if(generatedTurns[i].length > 0)
        {
            turnsArray.push(new Turn(generatedTurns[i], i + 1));
        }
    }
    return turnsArray;
}

function removeElementFromArray(array, filter)
{
    let newArray = [];

    for(let i = 0; i < array.length; i++)
    {
        if(!arrayContainsArray(array, filter)) { newArray.push(array[i]); }
    }

    return newArray;
}

function makeTurn(turn, meToMove)
{
    let turnCaps = turn.capturedThisTurn;
    for(let i = 0; i < turnCaps.length; i++)
    {
        //capture the squares
        let currentCoord = turnCaps[i];
        searchGame[currentCoord[0]][currentCoord[1]] = meToMove ? myCaptured : oppCaptured;
        if(meToMove) { myTerritory.push([currentCoord[0], currentCoord[1]]); }
        else { oppTerritory.push([currentCoord[0], currentCoord[1]]); }
    }
}

function unmakeTurn(turn, meToMove)
{
    let turnCaps = turn.capturedThisTurn;
    for(let i = 0; i < turnCaps.length; i++)
    {
        //set squares back to original colors
        let currentCoord = turnCaps[i];
        searchGame[currentCoord[0], currentCoord[1]] = turn.selectedColor;
        if(meToMove) { myTerritory = removeElementFromArray(myTerritory, [currentCoord[0], currentCoord[1]]); }
        else { oppTerritory = removeElementFromArray(oppTerritory, [currentCoord[0], currentCoord[1]]); }
    }
}

//evaluation function evaluating...
//# of cells captured
//number of cells touching?
function evaluate(game)
{
    let myCells = myTerritory.length;
    let oppCells = oppTerritory.length;

    let eval = myCells - oppCells;

    return eval;
}

let bestTurn = new Turn([], 0, false);
let previousBestEvalutaion = -99999;
function search(depth)
{
    if(!doSearch)
    {
        return 0;
    }

    let searchTurns = generateTurns(searchTurn);
    //detect win or locked positions

    if(depth == 0)
    {
        return evaluate(searchGame)
    }

    let eval = -999999;
    for(let i = 0; i < searchTurns.length; i++)
    {
        makeTurn(searchTurns[i], searchTurn);
        searchTurn = !searchTurn;
            
        //recursive search
        eval = Math.max(eval, -search(depth - 1));

        searchTurn = !searchTurn;
        unmakeTurn(searchTurns[i]);

        if(eval > previousBestEvalutaion)
        {
            previousBestEvalutaion = eval;
            bestTurn = searchTurns[i];
        }
    }

    return eval;
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
function findTerritory(startingCoord, color)
{
    let queue = [];
    let visited = new Array(56).fill(false);

    visited[startingCoord] = true;
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

                    console.log("appending coordinate " + neighbor);
                }
            }
        }
    }
    
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
    console.log(territory);
}
function startSearch()
{
    searchGame = currentGame;
    searchTurn = myTurnCheckbox.checked

    goButton.disabled = true;
    stopButton.disabled = false;
    
    
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