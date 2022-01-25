import * as utils from '@dcl/ecs-scene-utils'
import { Sound } from './sound'
import { currentPlayerId } from './trackPlayers'
import { sceneMessageBus } from 'src/modules/messageBus'
import { checkIfPicking, PickedUp } from './pickup'
import { getEntityWithId, SyncId } from './syncId'

// Track player's state
export enum BeerBaseState {
  NONE = 'Blank',
  RED_BEER = 'PourRed',
  YELLOW_BEER = 'PourYellow',
  GREEN_BEER = 'PourGreen',
}

// Multiplayer
type BeerGlassState = {
  id: string
  position: Vector3
  beerState: BeerBaseState
  carryingPlayer: string
}

// Sound
const pickUpSound = new Sound(new AudioClip('sounds/pickUp.mp3'))
// const putDownSound = new Sound(new AudioClip('sounds/putDown.mp3'))
const swallowSound = new Sound(new AudioClip('sounds/swallow.mp3'))

export class BeerGlass extends Entity {
  //   public glass: Entity
  public isFull: boolean = false
  public beerBaseState: BeerBaseState = BeerBaseState.NONE

  constructor(
    id: string,
    model: GLTFShape,
    position: Vector3,
    public holdPosition: Vector3
  ) {
    super()
    this.addComponent(new Transform({ position: position }))

    this.addComponent(new SyncId(id))

    this.addComponent(model)

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
            pickUpSound.getComponent(AudioSource).playOnce()

            this.addComponentOrReplace(
              new PickedUp(currentPlayerId, {
                holdPosition: beerHoldPosition,
                lastPos: this.getComponent(Transform).position,
                putDownSound: 'sounds/putDown.mp3',
              })
            )
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

  drink(): void {
    swallowSound.getComponent(AudioSource).playOnce()

    this.isFull = false
    this.getComponent(Animator).getClip('Blank').play()
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

sceneMessageBus.on('BeerGlassDrink', (beerGlassState: BeerGlassState) => {
  let beer: BeerGlass = getEntityWithId(beerGlassState.id) as BeerGlass
  beer.drink()
})

sceneMessageBus.on('BeerGlassPourAnim', (beerGlassState: BeerGlassState) => {
  let beer: BeerGlass = getEntityWithId(beerGlassState.id) as BeerGlass
  beer.playPourAnim()
})

// Beer glasses
const beerGlassShape = new GLTFShape('models/beerGlass.glb')

const beerHoldPosition = new Vector3(0, -0.75, 0.4)

// NOTE: We're matching the beer object's position in the array with the id
const beerGlass1 = new BeerGlass(
  'beer0',
  beerGlassShape,
  new Vector3(8.3, 1.25, 8),
  beerHoldPosition
)
const beerGlass2 = new BeerGlass(
  'beer1',
  beerGlassShape,
  new Vector3(7.8, 1.25, 8.3),
  beerHoldPosition
)
const beerGlass3 = new BeerGlass(
  'beer2',
  beerGlassShape,
  new Vector3(1.86, 0.8, 13.4),
  beerHoldPosition
)
const beerGlass4 = new BeerGlass(
  'beer3',
  beerGlassShape,
  new Vector3(2.3, 0.8, 14),
  beerHoldPosition
)
const beerGlass5 = new BeerGlass(
  'beer4',
  beerGlassShape,
  new Vector3(13.7, 0.8, 13.8),
  beerHoldPosition
)
const beerGlass6 = new BeerGlass(
  'beer5',
  beerGlassShape,
  new Vector3(13.9, 0.8, 14.3),
  beerHoldPosition
)
const beerGlass7 = new BeerGlass(
  'beer6',
  beerGlassShape,
  new Vector3(14.5, 0.8, 2.5),
  beerHoldPosition
)
const beerGlass8 = new BeerGlass(
  'beer7',
  beerGlassShape,
  new Vector3(13.7, 0.8, 1.9),
  beerHoldPosition
)
const beerGlass9 = new BeerGlass(
  'beer8',
  beerGlassShape,
  new Vector3(2.4, 0.8, 1.5),
  beerHoldPosition
)
const beerGlass10 = new BeerGlass(
  'beer9',
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
