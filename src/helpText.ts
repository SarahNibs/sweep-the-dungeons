// Help text for the game
// Edit this file to update the help screen content

export const helpText = `
# Sweep The Dungeons - Help

## TL;DR
Click on your cards to play them for energy. Click on tiles to reveal them.
If they're yours (green), get info about how many adjacent tiles are yours
and continue your turn. Otherwise your turn ends. Reveal a mine and you lose.
Right-click tiles to mark off the ones that aren't yours so you don't forget.
Finish 21 floors to win. Click and hold the title banner for a new game.

## The Floor
A floor is a few dozen tiles, many of which you need to clean (reveal).
Each tile is either:
- for you to clean (green)
- for your rival to clean (red)
- neither (neutral)
- or it's mined! (purple)
The numbers of each type of tile still left unrevealed is shown to the
top right of the tiles. Once you've cleaned all of your tiles, you've
completed this floor and will move on to the next. Make sure to do so
before your rival cleans all of their tiles, though, or you lose the game!

## Information
When a tile is revealed, you get adjacency info. When you reveal it, that
info tells you the number of tiles adjacent (diagonal counts too!) to this
one which are yours to clean, whether already revealed or still unrevealed.
When your rival reveals it, the adjacency info is about how many nearby
tiles are theirs to clean, not yours. There are many other ways to gain
information, via cards and equipment. Some of this information will be
denoted on the lower right corner of tiles in the form of small colored
squares; if, for example, a green square and a yellow square are present,
that means you have seen information indicating the tile can only be either
yours to clean or a neutral tile, it can't be your rivals to clean and it
can't be mined. When a tile is definitely not yours to clean, a black slash
will appear over it. You may also right-click tiles to toggle this black
slash at your whim; the game does not do any adjacency information deduction
for you, that you must perform yourself.

## Cards
You have many cards which will help you determine which tiles are yours
to clean! Click on a card to play it; many will ask you to further click
on a target tile, or target area of tiles. Each costs some amount of energy
to play, usually 1. To start your turn you'll draw 5 cards and get 3 energy
with which to play some of them. One specific type of card is an "Instruction"
card; you start with Imperious Instructions. Playing these cards will provide
information about which tiles are yours to clean by displaying pips on tiles,
but far from perfect information. The more pips, the more likely it is that
tile is yours to clean. Imperious Instructions distributes 10 pips amongst
tiles, and most of the time two tiles will receive the majority of those pips
and will be yours to clean. Most of the time.

## The Turn
Draw 5 cards, then play cards and click on tiles! When you click on a tile,
you'll reveal it. If it was yours to clean, it will be shown as green and
you can try revealing more tiles. If it wasn't, your turn will be over and
your rival will take a turn, usually but not always revealing around two of
their tiles and one other tile. If you reveal a mined tile, you immediately
lose the game. Unless you still have Grace for this floor. You may also choose
to end your turn by clicking on the arrow to the right of your cards.

## Status Effects
To the right of the tiles are status effects. These change how your turns
or your rival's turns work; hover over them to read about the effects. Most
status effects will appear because of cards you've played. Grace is a status
effect you start with on every floor, which lets you reveal one mine without
losing. You might want to clean up the Evidence cards this adds to your draw
and discard pile, though, or your pay will be docked!

## Copper
You gain copper for cleaning. The primary ways you'll gain copper are by
completing a floor faster than your rival and by cleaning up your tiles.
Whenever you complete a floor, you gain 1 copper per tile your rival still
hasn't revealed. And for every 5 of your own tiles that are revealed, you
gain 1 copper. Even if it's your rival cleaning up your tiles! Copper may be
spent in shops to improve your ability to clean.

## Rewards
After every floor, you get rewards. Sometimes you'll be offered a choice of
three cards; you can click one of them to add it to your deck going forward,
or you can choose to skip adding any of them. Sometimes you'll be offered a
choice to either remove a card from your deck, upgrade a specific card in
your deck to refund 1 energy when played, or upgrade a specific card in your
deck to have an enhanced effect when played. Sometimes you'll be offered a
choice of three pieces of equipment. And after every 5th floor, you'll find
yourself in a shop and can spend your copper on cards, upgrades, equipment,
removals, or a lil bunny to help with the next floor, which is always a
trickier one.

## Equipment
From equipment rewards or shops you can obtain powerful equipment which helps in
a variety of ways. Some modify your deck, some modify your turn, some modify
your rival's turn, etc. They will appear to the left of your tiles, under
the copper display.

## Tricky Floors
After every shop, the next floor will be a bit trickier, because your rival
will know where all of the mined tiles are! They will have no chance of
revealing a mine and handing you the floor for free. In general, floors will
become more difficult as you progress, because they will have more tiles,
different shapes, dirt, goblins, and more mines. Some floors will redefine
adjacency; rather than the four tiles next to a tile plus the four tiles
diagonal to a tile, also the four tiles directly up, down, left and right of
a tile but two tiles away will be considered adjacent. And your rival's
ability to guess which tiles are theirs to clean will get better, the deeper
you clean!

## Dirt, Goblins, Surface Mines
Eventually some tiles will have dirt on them, or goblins, or visible mines.
Dirt must be removed from a tile before you can click on it and reveal it.
If you click on it anyway, you'll clean off the dirt, but since you didn't
reveal the tile, it will become your rival's turn. Goblins are similar but
when they are "cleaned" they will move to an adjacent unrevealed tile, if any
are available. Visible mines will end your game if you try to reveal them,
just like mined tiles; find other ways to remove them, or protect yourself
first in some other way!
`
