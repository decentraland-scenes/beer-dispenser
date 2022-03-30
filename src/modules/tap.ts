import * as utils from '@dcl/ecs-scene-utils'
import { beerGlasses, BeerType, GlassData } from 'beerGlass'
import { sceneMessageBus } from 'src/modules/messageBus'
import { CreateSound } from './sound'
import { getEntityWithId, SyncId } from './syncId'

// Sound
const beerPumpSound = CreateSound(new AudioClip('sounds/beerPump.mp3'))

@Component('tapData')
export class TapData {
  beerType: BeerType = BeerType.NONE
  isBeingUsed: boolean = false

  constructor(beerType: BeerType) {
    this.beerType = beerType
  }
}

export function createTap(id: string, model: GLTFShape, beerType: BeerType) {
  const tap = new Entity()
  engine.addEntity(tap)
  tap.addComponent(model)
  tap.addComponent(new Transform())

  tap.addComponent(new SyncId(id))
  tap.addComponent(new TapData(beerType))

  tap.addComponent(new Animator())
  tap
    .getComponent(Animator)
    .addClip(new AnimationState('Blank', { looping: false }))
  tap
    .getComponent(Animator)
    .addClip(new AnimationState('Pour', { looping: false }))
  tap.getComponent(Animator).getClip('Blank').play()

  tap.addComponent(
    new OnPointerDown(
      () => {
        if (tap.getComponent(TapData).isBeingUsed) return
        // animate tap
        sceneMessageBus.emit('TapPourAnim', {
          id: tap.getComponent(SyncId).id
        })

        const dispenser = tap.getParent()

        // animate beer glass
        for (const entity of beerGlasses.entities) {
          if (
            entity.getParent() === dispenser &&
            entity.getComponent(GlassData).beerType ===
              tap.getComponent(TapData).beerType
          ) {
            sceneMessageBus.emit('BeerGlassPourAnim', {
              id: entity.getComponent(SyncId).id
            })
          }
        }
      },
      {
        button: ActionButton.PRIMARY,
        hoverText: 'Pour',
        showFeedback: true
      }
    )
  )
  return tap
}

sceneMessageBus.on('TapPourAnim', (data: { id: string }) => {
  const tap = getEntityWithId(data.id) as Entity
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
