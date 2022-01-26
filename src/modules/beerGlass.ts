import * as utils from '@dcl/ecs-scene-utils'
import { Sound } from './sound'
import { currentPlayerId } from './trackPlayers'
import { sceneMessageBus } from 'src/modules/messageBus'
import { checkIfHolding, getPickedUpItem, PickedUp } from './pickup'
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

@Component('glasData')
export class GlassData {
  beerType: BeerType = BeerType.NONE
  isFull: boolean = false
  holdPosition: Vector3
  isBeingFilled: boolean = false
  constructor(beerType: BeerType, isFull?: boolean, holdPosition?: Vector3) {
    this.beerType = beerType
    this.isFull = isFull ? isFull : false
    this.holdPosition = holdPosition ? holdPosition : new Vector3(0, -0.75, 0.4)
  }
}

export let beerGlasses = engine.getComponentGroup(GlassData)

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

    this.addComponent(new GlassData(BeerType.NONE, false, holdPosition))

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
            !checkIfHolding(currentPlayerId) &&
            !this.getComponent(GlassData).isBeingFilled
          ) {
            pickUpSound.getComponent(AudioSource).playOnce()

            this.addComponentOrReplace(
              new PickedUp(currentPlayerId, {
                holdPosition: this.getComponent(GlassData).holdPosition,
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
        position: new Vector3(0, 0.25, 0),
        scale: new Vector3(0.1, 0.1, 0.1),
      })
    )
    label.addComponent(new TextShape(this.getComponent(SyncId).id.toString()))
  }
}

// drink
Input.instance.subscribe('BUTTON_DOWN', ActionButton.SECONDARY, false, () => {
  let pickedUpItem = getPickedUpItem(currentPlayerId) as BeerGlass
  if (!pickedUpItem) return
  if (
    (pickedUpItem.getComponent(SyncId).id,
    pickedUpItem.getComponent(GlassData).isFull)
  ) {
    sceneMessageBus.emit('BeerGlassDrink', {
      id: pickedUpItem.getComponent(SyncId).id,
    })
  }
})

sceneMessageBus.on('BeerGlassDrink', (data: { id: string }) => {
  let beer: BeerGlass = getEntityWithId(data.id) as BeerGlass

  if (!beer) return
  swallowSound.getComponent(AudioSource).playOnce()
  beer.getComponent(GlassData).isFull = false
  beer.getComponent(Animator).getClip('Blank').play()
})

// pour beer
sceneMessageBus.on('BeerGlassPourAnim', (data: { id: string }) => {
  let beer: BeerGlass = getEntityWithId(data.id) as BeerGlass

  if (!beer) return

  beer
    .getComponent(Animator)
    .getClip(beer.getComponent(GlassData).beerType)
    .play()

  beer.getComponent(GlassData).isBeingFilled = true

  beer.getComponent(OnPointerDown).showFeedback = false

  beer.addComponentOrReplace(
    new utils.Delay(2500, () => {
      beer.getComponent(GlassData).isFull = true
      beer.getComponent(GlassData).isBeingFilled = false
      beer.getComponent(OnPointerDown).showFeedback = true
    })
  )
})
