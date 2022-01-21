import * as utils from '@dcl/ecs-scene-utils'
import { Sound } from './sound'
import { currentPlayerId, players } from './trackPlayers'
import { sceneMessageBus } from 'src/messageBus'
import { checkIfPicking, PickedUp } from './pickup'
import { SyncId } from './syncId'

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
  //   public glass: Entity
  public isFull: boolean = false
  public beerBaseState: BeerBaseState = BeerBaseState.NONE

  constructor(
    id: number,
    model: GLTFShape,
    position: Vector3,
    public holdPosition: Vector3
  ) {
    super()
    this.addComponent(new Transform({ position: position }))

    this.addComponent(new SyncId(id))

    // this.glass = new Entity()
    // this.glass.addComponent(new Transform())
    this.addComponent(model)
    // engine.addEntity(this.glass)
    // this.glass.setParent(this)
    engine.addEntity(this)

    this.addComponent(new Animator())
    this.getComponent(Animator).addClip(
      new AnimationState('Blank', { looping: false })
    )
    this.getComponent(Animator).addClip(
      new AnimationState('PourRed', { looping: false })
    )
    this.getComponent(Animator).addClip(
      new AnimationState('PourYellow', { looping: false })
    )
    this.getComponent(Animator).addClip(
      new AnimationState('PourGreen', { looping: false })
    )
    this.getComponent(Animator).getClip('Blank').play()

    this.addComponent(
      new OnPointerDown(
        (e) => {
          if (
            currentPlayerId !== undefined &&
            !checkIfPicking(currentPlayerId)
          ) {
            sceneMessageBus.emit('BeerGlassPickedUp', {
              id: this.getComponent(SyncId).id,
              position: this.holdPosition,
              carryingPlayer: currentPlayerId,
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
    label.setParent(this)
    label.addComponent(
      new Transform({
        position: new Vector3(0, 0.4, 0),
        scale: new Vector3(0.2, 0.2, 0.2),
      })
    )
    label.addComponent(new TextShape(this.getComponent(SyncId).id.toString()))
  }

  playPourAnim() {
    this.isFull = true
    this.getComponent(Animator).getClip(this.beerBaseState).play()
    this.removeComponent(OnPointerDown)
    this.addComponent(
      new utils.Delay(2500, () => {
        this.addPointerDown()
      })
    )
  }

  putDown(placePosition: Vector3, beerBaseState: BeerBaseState): void {
    this.setParent(null)
    engine.removeEntity(this.getComponent(PickedUp).parentEntity)

    this.addComponent(
      new utils.Delay(100, () => {
        this.removeComponent(PickedUp)
      })
    )

    this.addComponentOrReplace(
      new Transform({
        position: placePosition,
        rotation: Quaternion.Zero(),
      })
    )

    // this.getComponent(Transform).position = Vector3.Zero()
    // this.getComponent(Transform).rotation = Quaternion.Zero()

    putDownSound.getComponent(AudioSource).playOnce()
    this.beerBaseState = beerBaseState

    // let index: number | undefined = undefined
    // for (let i = 0; i < players.length; i++) {
    //   if (
    //     players[i].userId === playerId ||
    //     // in case scene thinks beer was in someone else's hand, remove it too
    //     (players[i].beer && players[i].beer!.id === this.id)
    //   ) {
    //     players[i].holdingBeerGlass = false
    //     players[i].beer = undefined
    //   }
    // }
  }

  drink(): void {
    swallowSound.getComponent(AudioSource).playOnce()

    this.isFull = false
    this.getComponent(Animator).getClip('Blank').play()
  }

  reset() {
    if (!this.hasComponent(PickedUp)) return

    this.addComponentOrReplace(
      new Transform({
        position: this.getComponent(PickedUp).lastPos,
        rotation: Quaternion.Zero(),
      })
    )
    this.getComponent(Transform).position = Vector3.Zero()
    this.getComponent(Transform).rotation = Quaternion.Zero()
    this.beerBaseState = BeerBaseState.NONE
    this.isFull = false
    this.removeComponent(PickedUp)
    // for (let i = 0; i < players.length; i++) {
    //   if (players[i].beer && players[i].beer!.id === this.id) {
    //     players[i].holdingBeerGlass = false
    //     players[i].beer = undefined
    //   }
    // }
  }

  addPointerDown() {
    this.addComponent(
      new OnPointerDown(
        (e) => {
          if (
            currentPlayerId !== undefined &&
            !checkIfPicking(currentPlayerId)
          ) {
            sceneMessageBus.emit('BeerGlassPickedUp', {
              id: this.getComponent(SyncId).id,
              position: this.holdPosition,
              carryingPlayer: currentPlayerId,
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
  //   beerGlasses[beerGlassState.id].pickup(beerGlassState.carryingPlayer)

  beerGlasses[beerGlassState.id].addComponentOrReplace(
    new PickedUp(beerGlassState.carryingPlayer, beerHoldPosition)
  )

  pickUpSound.getComponent(AudioSource).playOnce()

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
    beerGlassState.beerState
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
  beerHoldPosition
)
const beerGlass2 = new BeerGlass(
  1,
  beerGlassShape,
  new Vector3(7.8, 1.25, 8.3),
  beerHoldPosition
)
const beerGlass3 = new BeerGlass(
  2,
  beerGlassShape,
  new Vector3(1.86, 0.8, 13.4),
  beerHoldPosition
)
const beerGlass4 = new BeerGlass(
  3,
  beerGlassShape,
  new Vector3(2.3, 0.8, 14),
  beerHoldPosition
)
const beerGlass5 = new BeerGlass(
  4,
  beerGlassShape,
  new Vector3(13.7, 0.8, 13.8),
  beerHoldPosition
)
const beerGlass6 = new BeerGlass(
  5,
  beerGlassShape,
  new Vector3(13.9, 0.8, 14.3),
  beerHoldPosition
)
const beerGlass7 = new BeerGlass(
  6,
  beerGlassShape,
  new Vector3(14.5, 0.8, 2.5),
  beerHoldPosition
)
const beerGlass8 = new BeerGlass(
  7,
  beerGlassShape,
  new Vector3(13.7, 0.8, 1.9),
  beerHoldPosition
)
const beerGlass9 = new BeerGlass(
  8,
  beerGlassShape,
  new Vector3(2.4, 0.8, 1.5),
  beerHoldPosition
)
const beerGlass10 = new BeerGlass(
  9,
  beerGlassShape,
  new Vector3(1.8, 0.8, 2.3),
  beerHoldPosition
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
