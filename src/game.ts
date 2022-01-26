import { BeerGlass } from './modules/beerGlass'

import { getPickedUpItem, PickUpSystem } from './modules/pickup'
import { SyncId } from './modules/syncId'
import { currentPlayerId } from './modules/trackPlayers'

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
