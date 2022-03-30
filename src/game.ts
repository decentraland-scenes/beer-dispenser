import { CreateBeerGlass, BeerType, GlassData } from './modules/beerGlass'

import { OnDropItem, PickUpSystem, putDownEventData } from './modules/pickup'
import { getEntityWithId, SyncId } from './modules/syncId'
import { createTap } from './modules/tap'

// Tables
const tables = new Entity()
tables.addComponent(new GLTFShape('models/tables.glb'))
tables.addComponent(new Transform())
engine.addEntity(tables)

engine.addSystem(new PickUpSystem())

// Taps Base
const base = new Entity()
base.addComponent(new GLTFShape('models/baseDarkWithCollider.glb'))
engine.addEntity(base)

// Beer glasses
const beerGlassShape = new GLTFShape('models/beerGlass.glb')

const beerHoldPosition = new Vector3(0, -0.1, 0.4)

// NOTE: We're matching the beer object's position in the array with the id
const beerGlass1 = CreateBeerGlass(
  'beer0',
  beerGlassShape,
  new Vector3(8.3, 1.25, 8),
  beerHoldPosition
)
const beerGlass2 = CreateBeerGlass(
  'beer1',
  beerGlassShape,
  new Vector3(7.8, 1.25, 8.3),
  beerHoldPosition
)
const beerGlass3 = CreateBeerGlass(
  'beer2',
  beerGlassShape,
  new Vector3(1.86, 0.8, 13.4),
  beerHoldPosition
)
const beerGlass4 = CreateBeerGlass(
  'beer3',
  beerGlassShape,
  new Vector3(2.3, 0.8, 14),
  beerHoldPosition
)
const beerGlass5 = CreateBeerGlass(
  'beer4',
  beerGlassShape,
  new Vector3(13.7, 0.8, 13.8),
  beerHoldPosition
)
const beerGlass6 = CreateBeerGlass(
  'beer5',
  beerGlassShape,
  new Vector3(13.9, 0.8, 14.3),
  beerHoldPosition
)
const beerGlass7 = CreateBeerGlass(
  'beer6',
  beerGlassShape,
  new Vector3(14.5, 0.8, 2.5),
  beerHoldPosition
)
const beerGlass8 = CreateBeerGlass(
  'beer7',
  beerGlassShape,
  new Vector3(13.7, 0.8, 1.9),
  beerHoldPosition
)
const beerGlass9 = CreateBeerGlass(
  'beer8',
  beerGlassShape,
  new Vector3(2.4, 0.8, 1.5),
  beerHoldPosition
)

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
      'beer9'
    ],
    (data: putDownEventData) => {
      log('Dropping beer in dispenser', data)

      const pickedUpItem = getEntityWithId(data.pickedUpItem)
      const dropOnItem = getEntityWithId(data.dropOnItem)
      if (!pickedUpItem) return
      if (!dropOnItem) return

      // place beer under taps
      switch (data.hit.meshName) {
        case 'redBase_collider':
          pickedUpItem.setParent(dropOnItem)

          pickedUpItem.getComponent(Transform).position = new Vector3(
            0.368,
            0,
            0.31
          )
          pickedUpItem.getComponent(GlassData).beerType = BeerType.RED_BEER
          break
        case 'yellowBase_collider':
          pickedUpItem.setParent(dropOnItem)
          pickedUpItem.getComponent(Transform).position = new Vector3(
            0,
            0,
            0.31
          )
          pickedUpItem.getComponent(GlassData).beerType = BeerType.YELLOW_BEER
          break
        case 'greenBase_collider':
          pickedUpItem.setParent(dropOnItem)
          pickedUpItem.getComponent(Transform).position = new Vector3(
            -0.368,
            0,
            0.31
          )
          pickedUpItem.getComponent(GlassData).beerType = BeerType.GREEN_BEER
          break
      }
    }
  )
)

// Taps
const redTap = createTap(
  'tap1',
  new GLTFShape('models/redTap.glb'),
  BeerType.RED_BEER
)
redTap.setParent(beerDispenser)

const yellowTap = createTap(
  'tap2',
  new GLTFShape('models/yellowTap.glb'),
  BeerType.YELLOW_BEER
)
yellowTap.setParent(beerDispenser)

const greenTap = createTap(
  'tap3',
  new GLTFShape('models/greenTap.glb'),
  BeerType.GREEN_BEER
)
greenTap.setParent(beerDispenser)
