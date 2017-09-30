## `ern cauldron update binary <binaryPath>`
#### Description
* Update the binary of a native application version in the Cauldron

#### Syntax
`ern cauldron update binary <binaryPath>`

**Mandatory**

`binaryPath`
* File system path to the binary.  
For an Android binary, only a path to a `.apk` file is valid. For and iOS binary, only a path to a `.app` file is valid.

**Options**  

`--descriptor/-d <descriptor>`
* Update the binary for a given target native application version in the Cauldron matching the provided native application descriptor  
* You can only pass a complete native application descriptor as the binary update using this command target only a specific single native application version.  

**Default**  Lists all native application versions from the Cauldron and  prompts you to choose one to update the binary in

#### Related commands
 [ern cauldron add binary] | Add the binary of a native application version in the Cauldron

___  
[ern cauldron add binary]: ../add/binary.md