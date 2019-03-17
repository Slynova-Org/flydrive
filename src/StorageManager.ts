/**
 * @slynova/flydrive
 *
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

import Drivers from './Drivers'
import Storage from './Storage'
import { InvalidConfig, DriverNotSupported } from './Exceptions'

export default class StorageManager {
  /**
   * Configuration of the storage manager.
   */
  private _config: any

  /**
   * List of drivers extended
   */
  private _extendedDrivers: Map<string, () => Storage> = new Map()

  constructor(config) {
    this._config = config

    /**
     * Adding empty disk property to make future checks
     * simpler
     */
    this._config.disks = this._config.disks || {}
  }

  /**
   * Get a disk instance.
   */
  disk<T extends Storage>(name?: string, config?: any): T {
    name = name || this._config.default

    /**
     * No name is defined and neither there
     * are any defaults.
     */
    if (!name) {
      throw InvalidConfig.missingDiskName()
    }

    const diskConfig = this._config.disks[name]

    /**
     * Configuration for the defined disk is missing
     */
    if (!diskConfig) {
      throw InvalidConfig.missingDiskConfig(name)
    }

    /**
     * There is no driver defined on disk configuration
     */
    if (!diskConfig.driver) {
      throw InvalidConfig.missingDiskDriver(name)
    }

    /**
     * Call the custom driver constructor.
     */
    const customDriver = this._extendedDrivers.get(diskConfig.driver)
    if (customDriver) {
      // @ts-ignore
      return customDriver()
    }

    const Driver = Drivers[diskConfig.driver]

    /**
     * Unable to pull driver from the drivers list
     */
    if (!Driver) {
      throw DriverNotSupported.driver(diskConfig.driver)
    }

    return new Driver({ ...diskConfig, ...config })
  }

  /**
   * Register a custom driver.
   */
  public extend<T extends Storage>(name: string, handler: () => T) {
    this._extendedDrivers.set(name, handler)
  }
}
