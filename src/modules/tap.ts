import * as utils from '@dcl/ecs-scene-utils'
import { beerGlasses, BeerType, GlassData } from 'beerGlass'
import { sceneMessageBus } from 'src/modules/messageBus'
import { OnDropItem, putDownEventData } from './pickup'
import { Sound } from './sound'
import { getEntityWithId, SyncId } from './syncId'

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
