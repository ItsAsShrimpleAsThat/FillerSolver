# Filler Solver
### (i know the html/css is bad, this is my second time using it lol)

Engine/solver for my favorite game on [GamePigeon](https://apps.apple.com/us/app/gamepigeon/id1124197642).

I made this because I used to be the best in my friend group at this game, but recently, one of my friends got better than me at it, so I made this so I can beat them.

# How to use
There are 3 modes: <b>Search mode</b>, <b>Solve mode</b>, and <b>Play mode</b>.

<b>Search mode</b> operates a lot like a chess engine, such as Stockfish. In this mode, the solver will only search to a certain depth + some additional depth until the search has found quiescence <b>(if enabled)</b>. Many additional options are available in this mode.

<b>Solve mode</b> will fully solve the game. It will search every single possible position in the game, which will a bit longer than Search mode.

<b>Play mode</b>

## Setting up the search
#### The Board:
Setting up the board is really easy. When you first open the website, you will see something like this:
![The color input you see upon opening the website](/images/color-input.png)

Clicking on the colors at the bottom will select them. You will see them expand a little bit to show which color is selected.
Copy the current state of your game from your phone to the website

If you want, you can save the current state of the board using this menu on the side or load your last save
![The save/load menu](/images/board-save-load.png)

The window shows the saved game

#### The Search Settings
The GamePigeon Filler Solver has many settings you can tinker around with. Settings (will hopefully soon) automatically save, but the default values are shown below:
![The search settings menu](/images/search-settings.png)

Many settings will be disabled in solve mode. For information on how solve mode works, skip to the solve mode section.
Otherwise, here are some basic explanations on what the settings do.

##### Search Depth
The depth that the search will go to. Depending on whether or not you have **iterative deepening** enabled, the search will either go straight to that depth or one step at a time. (see the How it works section below for more details)

##### Current Turn
Selects whose turn it is. 

##### Iterative Deepning
Enables iterative deepening. Iterative deepening is a method of allowing the search to be cancelled at any time that relies heavily on alpha-beta-pruning to be fast. The idea is that you first search to a depth of one, then use the results from that search in the next search, which is to a depth of 2. Then we do that over and over until we reach the desired depth. This allows us to cancel the search at any time while still having a reasonable best move. It may also improve speed.

##### Quiescence Search
Searches until a quiet position (quiescence) has been reached. A quiet position is a position where, in one turn, the number of squares that can be captured is >3 or >0.5 * the number of squares the current player has captured total (the amount of territory they have).

##### Quiescence Search Limit
The max depth the quiescence search can go to (see the quiescence search section in the How it works section below)

### Solve Mode
WIP

## How it works
WIP