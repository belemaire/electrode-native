## `ern cauldron del file`

#### Description

* Remove a file from the Cauldron

#### Syntax

`ern cauldron del file <cauldronFilePath>`

**Arguments**

`<cauldronFilePath>`

* Target file path in the Cauldron, of the file to remove
* Relative to the root of the Cauldron repository
* Should include target file name (can be same as source filename or different)
* The file referenced by the path should exist in the Cauldron

#### Examples

- `ern cauldron del file foo/bar.json`  
Remove the file `bar.json` from directory `foo` of the Cauldron, 

#### Related commands

[ern cauldron add file] | Add a file in the Cauldron   
[ern cauldron del file] | Remove a file from the Cauldron

___  
[ern cauldron add file]: ../add/file.md
[ern cauldron del file]: ../del/file.md