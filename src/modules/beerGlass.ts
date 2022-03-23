import * as utils from '@dcl/ecs-scene-utils'
import { CreateSound } from './sound'
import { currentPlayerId } from './trackPlayers'
import { sceneMessageBus } from 'src/modules/messageBus'
import { checkIfHolding, getPickedUpItem, PickedUp } from './pickup'
import { getEntityWithId, SyncId } from './syncId'

// Track player's state
export enum BeerType {
  NONE = 'Blank',
  RED_BEER = 'PourRed',
  YELLOW_BEER = 'PourYellow',
  GREEN_BEER = 'PourGreen'
}

// Sound
const pickUpSound = CreateSound(new AudioClip('sounds/pickUp.mp3'))
const swallowSound = CreateSound(new AudioClip('sounds/swallow.mp3'))

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

export const beerGlasses = engine.getComponentGroup(GlassData)

export function CreateBeerGlass(
  id: string,
  model: GLTFShape,
  position: Vector3,
  holdPosition: Vector3
) {
  const glass = new Entity()
  glass.addComponent(new Transform({ position: position }))

  glass.addComponent(new SyncId(id))

  glass.addComponent(new GlassData(BeerType.NONE, false, holdPosition))

  glass.addComponent(model)

  engine.addEntity(glass)

  glass.addComponent(new Animator())
  glass
    .getComponent(Animator)
    .addClip(new AnimationState('Blank', { looping: false }))
  glass
    .getComponent(Animator)
    .addClip(new AnimationState('PourRed', { looping: false }))
  glass
    .getComponent(Animator)
    .addClip(new AnimationState('PourYellow', { looping: false }))
  glass
    .getComponent(Animator)
    .addClip(new AnimationState('PourGreen', { looping: false }))
  glass.getComponent(Animator).getClip('Blank').play()

  glass.addComponent(
    new OnPointerDown(
      (_e) => {
        if (
          currentPlayerId !== undefined &&
          !checkIfHolding(currentPlayerId) &&
          !glass.getComponent(GlassData).isBeingFilled
        ) {
          pickUpSound.getComponent(AudioSource).playOnce()

          glass.addComponentOrReplace(
            new PickedUp(currentPlayerId, {
              holdPosition: glass.getComponent(GlassData).holdPosition,
              lastPos: glass.getComponent(Transform).position,
              putDownSound: 'sounds/putDown.mp3'
            })
          )
        }
      },
      {
        button: ActionButton.PRIMARY,
        showFeedback: true,
        hoverText: 'pick up'
      }
    )
  )

  /// FOR DEBUG: DISPLAY NUMBERS ON BEERS
  const label = new Entity()
  label.setParent(glass)
  label.addComponent(
    new Transform({
      position: new Vector3(0, 0.25, 0),
      scale: new Vector3(0.1, 0.1, 0.1)
    })
  )
  label.addComponent(new TextShape(glass.getComponent(SyncId).id.toString()))
  return glass
}

// drink
Input.instance.subscribe('BUTTON_DOWN', ActionButton.SECONDARY, false, () => {
  const pickedUpItem = getPickedUpItem(currentPlayerId) as Entity
  if (!pickedUpItem) return
  if (
    (pickedUpItem.getComponent(SyncId).id,
    pickedUpItem.getComponent(GlassData).isFull)
  ) {
    sceneMessageBus.emit('BeerGlassDrink', {
      id: pickedUpItem.getComponent(SyncId).id
    })
  }
})

sceneMessageBus.on('BeerGlassDrink', (data: { id: string }) => {
  const beer: Entity = getEntityWithId(data.id) as Entity

  if (!beer) return
  swallowSound.getComponent(AudioSource).playOnce()
  beer.getComponent(GlassData).isFull = false
  beer.getComponent(Animator).getClip('Blank').play()
})

// pour beer
sceneMessageBus.on('BeerGlassPourAnim', (data: { id: string }) => {
  const beer = getEntityWithId(data.id)
  if (!beer) return

  beer
    .getComponent(Animator)
    .getClip(beer.getComponent(GlassData).beerType)
    .play()

  beer.getComponent(GlassData).isBeingFilled = true

  beer.getComponent(OnPointerDown).showFeedback = false

  beer.addComponentOrReplace(
    new utils.Delay(2500, () => {
      if (!beer) return
      beer.getComponent(GlassData).isFull = true
      beer.getComponent(GlassData).isBeingFilled = false
      beer.getComponent(OnPointerDown).showFeedback = true
    })
  )
})
