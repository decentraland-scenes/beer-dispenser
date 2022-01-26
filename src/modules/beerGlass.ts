import * as utils from '@dcl/ecs-scene-utils'
import { Sound } from './sound'
import { currentPlayerId } from './trackPlayers'
import { sceneMessageBus } from 'src/modules/messageBus'
import { checkIfPicking, getPickedUpItem, PickedUp } from './pickup'
import { getEntityWithId, SyncId } from './syncId'

// Track player's state
export enum BeerType {
  NONE = 'Blank',
  RED_BEER = 'PourRed',
  YELLOW_BEER = 'PourYellow',
  GREEN_BEER = 'PourGreen',
}

// Sound
const pickUpSound = new Sound(new AudioClip('sounds/pickUp.mp3'))
const swallowSound = new Sound(new AudioClip('sounds/swallow.mp3'))

@Component('beerData')
export class BeerData {
  beerType: BeerType = BeerType.NONE
  isFull: boolean = false
  holdPosition: Vector3
  constructor(beerType: BeerType, isFull?: boolean, holdPosition?: Vector3) {
    this.beerType = beerType
    this.isFull = isFull ? isFull : false
    this.holdPosition = holdPosition ? holdPosition : new Vector3(0, -0.75, 0.4)
  }
}

export class BeerGlass extends Entity {
  constructor(
    id: string,
    model: GLTFShape,
    position: Vector3,
    holdPosition: Vector3
  ) {
    super()
    this.addComponent(new Transform({ position: position }))

    this.addComponent(new SyncId(id))

    this.addComponent(new BeerData(BeerType.NONE, false, holdPosition))

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
                holdPosition: this.getComponent(BeerData).holdPosition,
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
    this.getComponent(BeerData).isFull = true
    this.getComponent(Animator)
      .getClip(this.getComponent(BeerData).beerType)
      .play()
    this.removeComponent(OnPointerDown)
    this.addComponent(
      new utils.Delay(2500, () => {
        this.addPointerDown()
      })
    )
  }

  drink(): void {
    swallowSound.getComponent(AudioSource).playOnce()

    this.getComponent(BeerData).isFull = false
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
              position: this.getComponent(BeerData).holdPosition,
              carryingPlayer: currentPlayerId,
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

// drink
Input.instance.subscribe('BUTTON_DOWN', ActionButton.SECONDARY, false, () => {
  let pickedUpItem = getPickedUpItem(currentPlayerId) as BeerGlass
  if (!pickedUpItem) return
  if (
    (pickedUpItem.getComponent(SyncId).id,
    pickedUpItem.getComponent(BeerData).isFull)
  ) {
    sceneMessageBus.emit('BeerGlassDrink', {
      id: pickedUpItem.getComponent(SyncId).id,
    })
  }
})

sceneMessageBus.on('BeerGlassDrink', (data: { id: string }) => {
  let beer: BeerGlass = getEntityWithId(data.id) as BeerGlass
  beer.drink()
})

// pour beer
sceneMessageBus.on('BeerGlassPourAnim', (data: { id: string }) => {
  let beer: BeerGlass = getEntityWithId(data.id) as BeerGlass
  beer.playPourAnim()
})
