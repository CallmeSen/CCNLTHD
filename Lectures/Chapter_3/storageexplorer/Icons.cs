using System;
using System.Drawing;
using System.Windows.Forms;
using System.Collections;
using System.Runtime.InteropServices;

namespace StorageExplorer
{

	/* This class acts like a pool of the Shell icons. If the client ask for
	 * an icon it will retrieve it from the Windows Shell and maintain the icon in 
	 * the pool so it can be retrieved faster later.
	 */
	sealed class FileIcons
	{
		private static Hashtable _iconIndex = new Hashtable();
		private static ImageList _smallImageList = new ImageList();
		
		public ImageList SmallImageList
		{
			get {return _smallImageList;}
		}

		private FileIcons () {}

		// The only way to access SystemIcons object is through static Instance
		// property. This creates singleton pattern
		public static readonly FileIcons Instance = new FileIcons();
        
		public int GetIconIndex (string pFileExtension)
		{
			int idx;
			if (_iconIndex.Contains (pFileExtension))
			{
				idx = (int) _iconIndex[pFileExtension];
			}
			else
			{
				Icon icon = IconReader.Instance.GetSmallFileTypeIcon (pFileExtension);
				idx = _smallImageList.Images.Count;
				_iconIndex.Add (pFileExtension, idx);
				_smallImageList.Images.Add (icon);
			}
			return idx;
		}
	}
	
	/* This class is to wrap the Shell API function related to icon.
	 * It follows wrapper facade pattern (POSA patterns volume 2),
	 * which hide the complexity of API calls and group functions with 
	 * the same purpose into a same class.
	 */
	sealed class IconReader
	{
		const int MAX_PATH = 256;
		const int NAMESIZE = 80;

		const uint SHGFI_ICON = 0x100;				// get icon handle & index. Get image list handle from SHFILEINFO.hIcon, index from SHFILEINFO.iIcon.
		const uint SHGFI_SMALLICON = 0x1;			// get small icon (SHGFI_ICON and/or SHGFI_SYSICONINDEX flag must be set)
		const uint SHGFI_USEFILEATTRIBUTES = 0x10;	// pszPath is not a real file. Use information in SHFILEINFO.dwFileAttribute
		const uint FILE_ATTRIBUTE_ARCHIVE = 0x20;
		const uint FILE_ATTRIBUTE_COMPRESSED = 0x800;
		const uint FILE_ATTRIBUTE_DIRECTORY = 0x10;
		const uint FILE_ATTRIBUTE_HIDDEN = 0x2;
		const uint FILE_ATTRIBUTE_NORMAL = 0x0;
		const uint FILE_ATTRIBUTE_READONLY = 0x1;
		const uint FILE_ATTRIBUTE_SYSTEM = 0x4;

		/*
		const uint SHGFI_ADDOVERLAYS = 0x20;		// apply overlays to file icons (SHGFI_ICON must be set)
		const uint SHGFI_ATTR_SPECIFIED = 0x20000;	// attributes is specified. Put attributes in SHFILEINFO.dwAttributes (SHGFI_ICON must be clear) 
		const uint SHGFI_ATTRIBUTES = 0x800;		// get attributes. Get it from SHFILEINFO.dwAttributes
		const uint SHGFI_DISPLAYNAME = 0x200;		// get file display name. Get it from SHFILEINFO.szDisplayName 
		const uint SHGFI_EXETYPE = 0x2000;			// return executable type of pszPath if it is executable file (All other flag must be clear)
		const uint SHGFI_ICON = 0x100;				// get icon handle & index. Get image list handle from SHFILEINFO.hIcon, index from SHFILEINFO.iIcon.
		const uint SHGFI_ICONLOCATION = 0x1000;		// get icon with a file
		const uint SHGFI_LARGEICON = 0x0;			// get large icon (SHGFI_ICON must be set)
		const uint SHGFI_LINKOVERLAY = 0x8000;		// add link overlay to file's icon (SHGFI_ICON must be set)
		const uint SHGFI_OPENICON = 0x2;			// get file's open icon (SHGFI_ICON and/or SHGFI_SYSICONINDEX flag must be set)
		const uint SHGFI_OVERLAYINDEX = 0x40;		// get the index of the overlay icon
		const uint SHGFI_PIDL = 0x8;				// pszPath is an ITEMIDLIST struct, not a path name
		const uint SHGFI_SELECTED = 0x10000;		// show icon as highlighted (SHGFI_ICON must be set)
		const uint SHGFI_SHELLICONSIZE = 0x4;		// get shell-sized icon (SHGFI_ICON must be set)
		const uint SHGFI_SMALLICON = 0x1;			// get small icon (SHGFI_ICON and/or SHGFI_SYSICONINDEX flag must be set)
		const uint SHGFI_SYSICONINDEX = 0x4000;     // get system icon index. Get it from SHFILEINFO.iIcon
		const uint SHGFI_TYPENAME = 0x400;			// get file type in string. Get it from SHFILEINFO.szTypeName 
		const uint SHGFI_USEFILEATTRIBUTES = 0x10;	// pszPath is not a real file. Use information in SHFILEINFO.dwFileAttribute
		*/

		// The exact structure needed to call shell API function
		[StructLayout(LayoutKind.Sequential)] 
		private struct SHFILEINFO
		{ 
			public IntPtr hIcon; 
			public int iIcon; 
			public uint	dwAttributes; 
			[MarshalAs (UnmanagedType.ByValTStr, SizeConst=MAX_PATH) ] 
			public string szDisplayName; 
			[MarshalAs (UnmanagedType.ByValTStr, SizeConst=NAMESIZE)]
			public string szTypeName; 
		};

		// The shell API function for retrieving file information
		[DllImport("Shell32.dll")]
		private static extern IntPtr SHGetFileInfo  (string pszPath,
			uint dwFileAttributes,
			ref SHFILEINFO psfi,
			uint cbFileInfo,
			uint uFlags);

		[DllImport("User32.dll")]
		public static extern int DestroyIcon (IntPtr hIcon);

		private IconReader() {}

		// The only way to access SystemIcons object is through static Instance
		// property. This creates singleton pattern
		public static readonly IconReader Instance = new IconReader();

		// Get the shell icon that represents a file type. The file type is 
		// distinguished by the parameter fileExtension
		public Icon GetSmallFileTypeIcon (string pFileExtension)
		{
			SHFILEINFO psfi = new SHFILEINFO ();
			uint uFlags = SHGFI_ICON | SHGFI_SMALLICON | SHGFI_USEFILEATTRIBUTES;

			uint fileAttribute = FILE_ATTRIBUTE_ARCHIVE
								| FILE_ATTRIBUTE_COMPRESSED
								| FILE_ATTRIBUTE_HIDDEN
								| FILE_ATTRIBUTE_NORMAL
								| FILE_ATTRIBUTE_READONLY 
								| FILE_ATTRIBUTE_SYSTEM;

			SHGetFileInfo (pFileExtension, fileAttribute, ref psfi,
				(uint) Marshal.SizeOf (psfi), uFlags);
			
			Icon icon = (Icon) Icon.FromHandle(psfi.hIcon).Clone(); 
			DestroyIcon(psfi.hIcon);
			return icon;
		}

		// Get the shell icon that represents a closed folder
		public Icon GetClosedFolderIcon ()
		{
			SHFILEINFO psfi = new SHFILEINFO ();
			uint uFlags = SHGFI_ICON | SHGFI_SMALLICON | SHGFI_USEFILEATTRIBUTES;

			SHGetFileInfo ("", FILE_ATTRIBUTE_DIRECTORY, ref psfi,
				(uint) Marshal.SizeOf (psfi), uFlags);
			
			Icon icon = (Icon) Icon.FromHandle(psfi.hIcon).Clone(); 
			DestroyIcon(psfi.hIcon);
			return icon;
		}
	}
}
