'use strict'

/**
 * node-flydrive
 * 
 * @license MIT
 * @copyright Slynova - Romain Lanz <romain.lanz@slynova.ch>
 */

module.exports = {

  /*
   |--------------------------------------------------------------------------
   | Default Filesystem Disk
   |--------------------------------------------------------------------------
   |
   | 
   |
   |
   */
  'default': 'local',

  /*
   |--------------------------------------------------------------------------
   | Filesystem Disks
   |--------------------------------------------------------------------------
   |
   |  
   |
   | Supported: "local", "s3"
   |
   */
  'disks': {

    'local': {
      'driver': 'local',
      'root': ''
    },

    's3': {
      'driver': 's3',
      'key': 'YOUR_KEY',
      'secret': 'YOUR_SECRET',
      'region': 'YOUR_REGION',
      'bucket': 'YOUR_BUCKET'
    }

  }

}
