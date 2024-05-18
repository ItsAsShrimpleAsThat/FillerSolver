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

const colors = ["rgb(255, 255, 255)", "rgb(234, 93, 110)", "rgb(150, 186, 88)", "rgb(219, 198, 70)", 
                                      "rgb(77, 145, 208)", "rgb(90, 67, 139)", "rgb(65, 65, 65)"];
const selectorGap = 30;
const selectorDistFromTop = 505;
const selectedBoxSizeDiff = 16; //MUST BE EVEN NUMBER TO PREVENT VISUAL BUGS

let selectedColor = 0;

let currentGame = [[0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0],
                   [0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0]];

let boxes = [];
let previousSelectedBox = -1;

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

            ctx.fillStyle = colors[selectedColor];
            ctx.fillRect(leftOffset + (gridCoord[0] * squareSize), gridCoord[1] * squareSize + topMargin, squareSize,  squareSize);  
            currentGame[gridCoord[0], gridCoord[1]] = selectedColor;
        }
    }
}

canvas.addEventListener('mousedown', function(e) {
    clickEvent(canvas, e);
})
