import * as utils from '@dcl/ecs-scene-utils'
import { Sound } from './sound'
import { players, thisPlayerIndex } from './trackPlayers'
import { sceneMessageBus } from 'src/messageBus'

// Track player's state
export enum BeerBaseState {
  NONE = 'Blank',
  RED_BEER = 'PourRed',
  YELLOW_BEER = 'PourYellow',
  GREEN_BEER = 'PourGreen',
}

// Multiplayer
type BeerGlassState = {
  id: number
  position: Vector3
  beerState: BeerBaseState
  carryingPlayer: string
}

// Sound
const pickUpSound = new Sound(new AudioClip('sounds/pickUp.mp3'))
const putDownSound = new Sound(new AudioClip('sounds/putDown.mp3'))
const swallowSound = new Sound(new AudioClip('sounds/swallow.mp3'))

export class BeerGlass extends Entity {
  public id: number
  public glass: Entity
  public isFull: boolean = false
  public beerBaseState: BeerBaseState = BeerBaseState.NONE
  public lastPos: Vector3

  constructor(
    id: number,
    model: GLTFShape,
    position: Vector3,
    public holdPosition: Vector3,
    public rotatePosition: number
  ) {
    super()
    this.addComponent(new Transform({ position: position }))
    engine.addEntity(this)

    this.id = id
    this.lastPos = position

    this.glass = new Entity()
    this.glass.addComponent(new Transform())
    this.glass.addComponent(model)
    engine.addEntity(this.glass)
    this.glass.setParent(this)

    this.glass.addComponent(new Animator())
    this.glass
      .getComponent(Animator)
      .addClip(new AnimationState('Blank', { looping: false }))
    this.glass
      .getComponent(Animator)
      .addClip(new AnimationState('PourRed', { looping: false }))
    this.glass
      .getComponent(Animator)
      .addClip(new AnimationState('PourYellow', { looping: false }))
    this.glass
      .getComponent(Animator)
      .addClip(new AnimationState('PourGreen', { looping: false }))
    this.glass.getComponent(Animator).getClip('Blank').play()

    this.glass.addComponent(
      new OnPointerDown(
        (e) => {
          if (
            thisPlayerIndex !== undefined &&
            !players[thisPlayerIndex].holdingBeerGlass
          ) {
            sceneMessageBus.emit('BeerGlassPickedUp', {
              id: this.id,
              position: this.holdPosition,
              carryingPlayer: players[thisPlayerIndex].userId,
              beerState: BeerBaseState.NONE,
            })
          }
        },
        {
          button: ActionButton.PRIMARY,
          showFeedback: true,
          hoverText: 'pick up',
        }
      )
    )

    /// FOR DEBUG: DISPLAY NUMBERS ON BEERS
    let label = new Entity()
    label.setParent(this.glass)
    label.addComponent(
      new Transform({
        position: new Vector3(0, 0.4, 0),
        scale: new Vector3(0.2, 0.2, 0.2),
      })
    )
    label.addComponent(new TextShape(this.id.toString()))
  }

  playPourAnim() {
    this.isFull = true
    this.glass.getComponent(Animator).getClip(this.beerBaseState).play()
    this.glass.removeComponent(OnPointerDown)
    this.addComponent(
      new utils.Delay(2500, () => {
        this.addPointerDown()
      })
    )
  }

  public pickup(playerId: string): void {
    log('PICKING UP FOR ', playerId)
    if (this.hasComponent(Transform)) {
      this.lastPos = this.getComponent(Transform).position
    }

    this.beerBaseState = BeerBaseState.NONE

    this.addComponentOrReplace(
      new AttachToAvatar({
        avatarId: playerId,
        anchorPointId: AttachToAvatarAnchorPointId.NameTag,
      })
    )

    pickUpSound.getComponent(AudioSource).playOnce()

    this.glass.getComponent(Transform).position = this.holdPosition
    this.glass
      .getComponent(Transform)
      .rotate(Vector3.Right(), this.rotatePosition)

    let index: number | undefined = undefined
    for (let i = 0; i < players.length; i++) {
      if (players[i].userId === playerId) {
        index = i
      }

      // if beer was in someone else's hand, remove it
      if (players[i].beer && players[i].beer!.id === this.id) {
        players[i].holdingBeerGlass = false
        players[i].beer = undefined
      }
    }
    if (index !== undefined && index === thisPlayerIndex) {
      // picked up by current player (delay slightly to prevent picking and dropping simultaneously)
      this.addComponentOrReplace(
        new utils.Delay(100, () => {
          players[index!].holdingBeerGlass = true
          players[index!].beer = this
        })
      )
    } else if (index !== undefined) {
      // picked up by other player tracked by the scene
      players[index].holdingBeerGlass = true
      players[index].beer = this
    } else {
      // picked up by other player NOT tracked by the scene yet
      players.push({
        userId: playerId,
        holdingBeerGlass: true,
        beer: this,
        isCurrentPlayer: false,
      })
    }
  }

  putDown(
    placePosition: Vector3,
    beerBaseState: BeerBaseState,
    playerId: string
  ): void {
    this.addComponentOrReplace(
      new Transform({
        position: placePosition,
        rotation: Quaternion.Zero(),
      })
    )
    this.glass.getComponent(Transform).position = Vector3.Zero()
    this.glass.getComponent(Transform).rotation = Quaternion.Zero()

    putDownSound.getComponent(AudioSource).playOnce()
    this.beerBaseState = beerBaseState

    let index: number | undefined = undefined
    for (let i = 0; i < players.length; i++) {
      if (
        players[i].userId === playerId ||
        // in case scene thinks beer was in someone else's hand, remove it too
        (players[i].beer && players[i].beer!.id === this.id)
      ) {
        players[i].holdingBeerGlass = false
        players[i].beer = undefined
      }
    }
  }

  drink(): void {
    swallowSound.getComponent(AudioSource).playOnce()

    this.isFull = false
    this.glass.getComponent(Animator).getClip('Blank').play()
  }

  reset() {
    this.addComponentOrReplace(
      new Transform({
        position: this.lastPos,
        rotation: Quaternion.Zero(),
      })
    )
    this.glass.getComponent(Transform).position = Vector3.Zero()
    this.glass.getComponent(Transform).rotation = Quaternion.Zero()
    this.beerBaseState = BeerBaseState.NONE
    this.isFull = false
    for (let i = 0; i < players.length; i++) {
      if (players[i].beer && players[i].beer!.id === this.id) {
        players[i].holdingBeerGlass = false
        players[i].beer = undefined
      }
    }
  }

  addPointerDown() {
    this.glass.addComponent(
      new OnPointerDown(
        (e) => {
          if (
            thisPlayerIndex !== undefined &&
            !players[thisPlayerIndex].holdingBeerGlass
          ) {
            sceneMessageBus.emit('BeerGlassPickedUp', {
              id: this.id,
              position: this.holdPosition,
              carryingPlayer: players[thisPlayerIndex].userId,
              beerState: BeerBaseState.NONE,
            })
          }
        },
        {
          button: ActionButton.PRIMARY,
          showFeedback: true,
          hoverText: 'pick up',
        }
      )
    )
  }
}

sceneMessageBus.on('BeerGlassPickedUp', (beerGlassState: BeerGlassState) => {
  beerGlasses[beerGlassState.id].pickup(beerGlassState.carryingPlayer)

  log(
    'PICKED UP GLASS ',
    beerGlassState.id,
    ' by ',
    beerGlassState.carryingPlayer,
    ' beer state ',
    beerGlassState.beerState
  )
})

sceneMessageBus.on('BeerGlassPutDown', (beerGlassState: BeerGlassState) => {
  beerGlasses[beerGlassState.id].putDown(
    beerGlassState.position,
    beerGlassState.beerState,
    beerGlassState.carryingPlayer
  )

  log(
    'PUTTING DOWN GLASS ',
    beerGlassState.id,
    ' at ',
    beerGlassState.position,
    ' by ',
    beerGlassState.carryingPlayer,
    ' beer state ',
    beerGlassState.beerState
  )
})

sceneMessageBus.on('BeerGlassDrink', (beerGlassState: BeerGlassState) => {
  beerGlasses[beerGlassState.id].drink()
})

sceneMessageBus.on('BeerGlassPourAnim', (beerGlassState: BeerGlassState) => {
  beerGlasses[beerGlassState.id].playPourAnim()
})

// Beer glasses
const beerGlassShape = new GLTFShape('models/beerGlass.glb')

const beerHoldPosition = new Vector3(0, -0.75, 0.4)

// NOTE: We're matching the beer object's position in the array with the id
const beerGlass1 = new BeerGlass(
  0,
  beerGlassShape,
  new Vector3(8.3, 1.25, 8),
  beerHoldPosition,
  -10
)
const beerGlass2 = new BeerGlass(
  1,
  beerGlassShape,
  new Vector3(7.8, 1.25, 8.3),
  beerHoldPosition,
  -10
)
const beerGlass3 = new BeerGlass(
  2,
  beerGlassShape,
  new Vector3(1.86, 0.8, 13.4),
  beerHoldPosition,
  -10
)
const beerGlass4 = new BeerGlass(
  3,
  beerGlassShape,
  new Vector3(2.3, 0.8, 14),
  beerHoldPosition,
  -10
)
const beerGlass5 = new BeerGlass(
  4,
  beerGlassShape,
  new Vector3(13.7, 0.8, 13.8),
  beerHoldPosition,
  -10
)
const beerGlass6 = new BeerGlass(
  5,
  beerGlassShape,
  new Vector3(13.9, 0.8, 14.3),
  beerHoldPosition,
  -10
)
const beerGlass7 = new BeerGlass(
  6,
  beerGlassShape,
  new Vector3(14.5, 0.8, 2.5),
  beerHoldPosition,
  -10
)
const beerGlass8 = new BeerGlass(
  7,
  beerGlassShape,
  new Vector3(13.7, 0.8, 1.9),
  beerHoldPosition,
  -10
)
const beerGlass9 = new BeerGlass(
  8,
  beerGlassShape,
  new Vector3(2.4, 0.8, 1.5),
  beerHoldPosition,
  -10
)
const beerGlass10 = new BeerGlass(
  9,
  beerGlassShape,
  new Vector3(1.8, 0.8, 2.3),
  beerHoldPosition,
  -10
)

export const beerGlasses: BeerGlass[] = [
  beerGlass1,
  beerGlass2,
  beerGlass3,
  beerGlass4,
  beerGlass5,
  beerGlass6,
  beerGlass7,
  beerGlass8,
  beerGlass9,
  beerGlass10,
]
