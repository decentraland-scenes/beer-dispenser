import { BeerBaseState, beerGlasses } from './modules/beerGlass'
import { Sound } from './modules/sound'

import * as ui from '@dcl/ui-scene-utils'
import { beerDispenser } from './modules/tap'
import { sceneMessageBus } from './messageBus'
import { players, thisPlayerIndex } from './modules/trackPlayers'

// Base
const base = new Entity()
base.addComponent(new GLTFShape('models/baseDarkWithCollider.glb'))
engine.addEntity(base)

// Sound
const errorSound = new Sound(new AudioClip('sounds/error.mp3'))

// Tables
const tables = new Entity()
tables.addComponent(new GLTFShape('models/tables.glb'))
tables.addComponent(new Transform())
engine.addEntity(tables)

// Instance the input object
const input = Input.instance

input.subscribe('BUTTON_DOWN', ActionButton.PRIMARY, true, (event) => {
  if (thisPlayerIndex === undefined) return
  log('HOLDING BEER? ', players[thisPlayerIndex].holdingBeerGlass, event.hit)
  if (
    players[thisPlayerIndex].holdingBeerGlass &&
    players[thisPlayerIndex].beer &&
    event.hit
  ) {
    if (event.hit.normal.y > 0.99) {
      let beerPosition: Vector3
      switch (event.hit.meshName) {
        case 'redBase_collider':
          beerPosition = beerDispenser
            .getComponent(Transform)
            .position.clone()
            .subtract(new Vector3(0.368, -0.02, 0.31))
          sceneMessageBus.emit('BeerGlassPutDown', {
            id: players[thisPlayerIndex].beer!.id,
            position: beerPosition,
            beerState: BeerBaseState.RED_BEER,
            carryingPlayer: players[thisPlayerIndex].userId,
          })
          break
        case 'yellowBase_collider':
          beerPosition = beerDispenser
            .getComponent(Transform)
            .position.clone()
            .subtract(new Vector3(0, -0.02, 0.31))

          sceneMessageBus.emit('BeerGlassPutDown', {
            id: players[thisPlayerIndex].beer!.id,
            position: beerPosition,
            beerState: BeerBaseState.YELLOW_BEER,
            carryingPlayer: players[thisPlayerIndex].userId,
          })

          break
        case 'greenBase_collider':
          beerPosition = beerDispenser
            .getComponent(Transform)
            .position.clone()
            .subtract(new Vector3(-0.368, -0.02, 0.31))

          sceneMessageBus.emit('BeerGlassPutDown', {
            id: players[thisPlayerIndex].beer!.id,
            position: beerPosition,
            beerState: BeerBaseState.GREEN_BEER,
            carryingPlayer: players[thisPlayerIndex].userId,
          })

          break
        default:
          log('DEFAULT')

          sceneMessageBus.emit('BeerGlassPutDown', {
            id: players[thisPlayerIndex].beer!.id,
            position: event.hit.hitPoint,
            beerState: BeerBaseState.NONE,
            carryingPlayer: players[thisPlayerIndex].userId,
          })

          break
      }
    } else {
      noSign.show(1)
      errorSound.getComponent(AudioSource).playOnce()
    }
  }
})

input.subscribe('BUTTON_DOWN', ActionButton.SECONDARY, false, () => {
  if (
    players[thisPlayerIndex].holdingBeerGlass &&
    players[thisPlayerIndex].beer &&
    players[thisPlayerIndex].beer?.isFull
  ) {
    // for (let i = 0; i < beerGlasses.length; i++) {
    // Check if item has a parent
    //   if (beerGlasses[i].getParent()?.alive && beerGlasses[i].isFull) {
    players[thisPlayerIndex].beer!.drink()
    //   }
  }
  //   }
})

let noSign = new ui.CenterImage(
  'images/no-sign.png',
  1,
  true,
  0,
  20,
  128,
  128,
  {
    sourceHeight: 512,
    sourceWidth: 512,
    sourceLeft: 0,
    sourceTop: 0,
  }
)
