## `ern cauldron add binary <binaryPath>`
#### Description
* Add the binary of a native application version in the Cauldron

#### Syntax
`ern cauldron add binary <binaryPath>`

**Mandatory**

`binaryPath`
* File system path to the binary.  
For an Android binary, only a path to a `.apk` file is valid. For and iOS binary, only a path to a `.app` file is valid.

**Options**  

`--descriptor/-d <descriptor>`
* Add the binary to a given target native application version in the Cauldron matching the provided native application descriptor  
* You can only pass a complete native application descriptor as the binary added using this command target only a specific single native application version.  

**Default**  Lists all native application versions from the Cauldron and prompts you to choose one to add the binary to

#### Related commands
 [ern cauldron update binary] | Update the binary of a native application version in the Cauldron

___  
[ern cauldron update binary]: ../update/binary.md