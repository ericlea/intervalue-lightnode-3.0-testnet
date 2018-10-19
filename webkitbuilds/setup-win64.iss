; Script generated by the Inno Setup Script Wizard.
; SEE THE DOCUMENTATION FOR DETAILS ON CREATING INNO SETUP SCRIPT FILES!

#define MyAppName "InterValue-3.0-testnet"
#define MyAppPackageName "InterValue-3.0-testnet"
#define MyAppVersion "1.0.9"
#define MyAppPublisher "InterValue-3.0-testnet"
#define MyAppURL "https://www.inve.one"
#define MyAppExeName "InterValue-3.0-testnet.exe"

[Setup]
; AppId={{804636ee-b017-4cad-8719-e58ac97ffa5c}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
;AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={pf}\{#MyAppName}
DefaultGroupName={#MyAppName}
OutputBaseFilename={#MyAppPackageName}-win64
;SourceDir=../../intervaluebuilds
OutputDir=..\..\intervaluebuilds
Compression=lzma
SolidCompression=yes
SetupIconFile=..\public\img\icons\icon-white-outline.ico
UninstallDisplayIcon={app}\icon.ico
;ChangesAssociations=yes
;ChangesEnvironment=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
; Name: "french"; MessagesFile: "compiler:Languages\French.isl"
; Name: "japanese"; MessagesFile: "compiler:Languages\Japanese.isl"
; Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Registry]
Root: HKLM; Subkey: "Software\Classes\InterValue-3.0-testnet"; Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\Classes\InterValue-3.0-testnet"; ValueType: string; ValueName: ""; ValueData: "URL:InterValue-3.0-testnet Protocol"
Root: HKLM; Subkey: "Software\Classes\InterValue-3.0-testnet"; ValueType: string; ValueName: "URL Protocol"; ValueData: ""
Root: HKLM; Subkey: "Software\Classes\InterValue-3.0-testnet\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\icon.ico"
Root: HKLM; Subkey: "Software\Classes\InterValue-3.0-testnet\shell"
Root: HKLM; Subkey: "Software\Classes\InterValue-3.0-testnet\shell\open"
Root: HKLM; Subkey: "Software\Classes\InterValue-3.0-testnet\shell\open\command"; ValueType: string; ValueName: ""; ValueData: "{app}\{#MyAppExeName} ""%1"""

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags:checkablealone

[Files]
; Source: "..\intervaluebuilds\intervalue-test\win64\intervalue.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\intervaluebuilds\{#MyAppPackageName}\win64\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\public\img\icons\icon-white-outline.ico"; DestDir: "{app}"; DestName: "icon.ico"; Flags: ignoreversion
; NOTE: Don't use "Flags: ignoreversion" on any shared system files

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\icon.ico"
Name: "{commondesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\icon.ico"; Tasks: desktopicon


[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

