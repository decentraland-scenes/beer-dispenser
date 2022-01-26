import * as utils from '@dcl/ecs-scene-utils'
import { BeerGlass, beerGlasses, BeerType, GlassData } from 'beerGlass'
import { sceneMessageBus } from 'src/modules/messageBus'
import { OnDropItem, putDownEventData } from './pickup'
import { Sound } from './sound'
import { getEntityWithId, SyncId } from './syncId'

// Dispenser
export const beerDispenser = new Entity()
beerDispenser.addComponent(new GLTFShape('models/beerDispenser.glb'))
beerDispenser.addComponent(
  new Transform({ position: new Vector3(8, 1.25, 7.5) })
)

beerDispenser.getComponent(Transform).rotate(Vector3.Up(), 180)
engine.addEntity(beerDispenser)
beerDispenser.addComponent(new SyncId('beerDispenser1'))
beerDispenser.addComponentOrReplace(
  new OnDropItem(
    [
      'beer0',
      'beer1',
      'beer2',
      'beer3',
      'beer4',
      'beer5',
      'beer6',
      'beer7',
      'beer8',
      'beer9',
    ],
    (data: putDownEventData) => {
      log('Dropping beer in dispenser', data)

      let pickedUpItem = getEntityWithId(data.pickedUpItem)
      let dropOnItem = getEntityWithId(data.dropOnItem)
      if (!pickedUpItem) return
      if (!dropOnItem) return

      // place beer under taps
      let finalPosition: Vector3
      switch (data.hit.meshName) {
        case 'redBase_collider':
          pickedUpItem.setParent(dropOnItem)

          pickedUpItem.getComponent(Transform).position = new Vector3(
            0.368,
            0,
            0.31
          )
          pickedUpItem.getComponent(GlassData).beerType = BeerType.RED_BEER
          //   redTap.getComponent(RefToEntity).entity = pickedUpItem

          break
        case 'yellowBase_collider':
          pickedUpItem.setParent(dropOnItem)
          pickedUpItem.getComponent(Transform).position = new Vector3(
            0,
            0,
            0.31
          )
          pickedUpItem.getComponent(GlassData).beerType = BeerType.YELLOW_BEER
          //   yellowTap.getComponent(RefToEntity).entity = pickedUpItem
          break
        case 'greenBase_collider':
          pickedUpItem.setParent(dropOnItem)
          pickedUpItem.getComponent(Transform).position = new Vector3(
            -0.368,
            0,
            0.31
          )
          pickedUpItem.getComponent(GlassData).beerType = BeerType.GREEN_BEER
          //   greenTap.getComponent(RefToEntity).entity = pickedUpItem
          break
      }
    }
  )
)

// Sound
const beerPumpSound = new Sound(new AudioClip('sounds/beerPump.mp3'))

@Component('tapData')
export class TapData {
  beerType: BeerType = BeerType.NONE
  isBeingUsed: boolean = false

  constructor(beerType: BeerType) {
    this.beerType = beerType
  }
}

export class Tap extends Entity {
  constructor(id: string, model: GLTFShape, beerType: BeerType) {
    super()
    engine.addEntity(this)
    this.addComponent(model)
    this.addComponent(new Transform())

    this.addComponent(new SyncId(id))
    this.addComponent(new TapData(beerType))
    // this.addComponent(new RefToEntity())

    this.addComponent(new Animator())
    this.getComponent(Animator).addClip(
      new AnimationState('Blank', { looping: false })
    )
    this.getComponent(Animator).addClip(
      new AnimationState('Pour', { looping: false })
    )
    this.getComponent(Animator).getClip('Blank').play()

    this.addComponent(
      new OnPointerDown(
        () => {
          if (this.getComponent(TapData).isBeingUsed) return
          // animate tap
          sceneMessageBus.emit('TapPourAnim', {
            id: this.getComponent(SyncId).id,
          })

          let dispenser = this.getParent()

          // animate beer glass
          for (let entity of beerGlasses.entities) {
            if (
              entity.getParent() === dispenser &&
              entity.getComponent(GlassData).beerType ===
                this.getComponent(TapData).beerType
            ) {
              sceneMessageBus.emit('BeerGlassPourAnim', {
                id: entity.getComponent(SyncId).id,
              })
            }
          }
        },
        {
          button: ActionButton.PRIMARY,
          hoverText: 'Pour',
          showFeedback: true,
        }
      )
    )
  }
}

sceneMessageBus.on('TapPourAnim', (data: { id: string }) => {
  let tap = getEntityWithId(data.id) as Tap
  if (!tap) return

  beerPumpSound.getComponent(AudioSource).playOnce()

  tap.getComponent(Animator).getClip('Pour').play()
  tap.getComponent(TapData).isBeingUsed = true
  tap.getComponent(OnPointerDown).showFeedback = false

  tap.addComponent(
    new utils.Delay(2500, () => {
      tap.getComponent(OnPointerDown).showFeedback = true
      tap.getComponent(TapData).isBeingUsed = false
    })
  )
})

// Taps
const redTap = new Tap(
  'tap1',
  new GLTFShape('models/redTap.glb'),
  BeerType.RED_BEER
)
redTap.setParent(beerDispenser)

const yellowTap = new Tap(
  'tap2',
  new GLTFShape('models/yellowTap.glb'),
  BeerType.YELLOW_BEER
)
yellowTap.setParent(beerDispenser)

const greenTap = new Tap(
  'tap3',
  new GLTFShape('models/greenTap.glb'),
  BeerType.GREEN_BEER
)
greenTap.setParent(beerDispenser)
