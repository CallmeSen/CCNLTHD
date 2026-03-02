using System;
using System.IO;
using System.Collections;
using System.Windows.Forms;


namespace StorageExplorer 
{

	// Event arguments for ExplorationFinishEventHandler
	public class ExplorationFinishEventArgs : EventArgs
	{
		public Hashtable ExplorationResult;
	}

	// Event arguments for ProgressEventHandler
	public class ExplorationProgressEventArgs : EventArgs
	{
		public string Path;
	}

	// Signature of Finish event
	public delegate void ExplorationFinishEventHandler (object sender, ExplorationFinishEventArgs e);

	// Signature of Progress event
	public delegate void ExplorationProgressEventHandler (object sender, ExplorationProgressEventArgs e);

	/* This class is the base class for the concrete strategy classes:
	 * 1. FolderStrategy (obtain file size grouped by folder)
	 * 2. FileTypeStrategy (obtain file size grouped by file type)
	 */
	public abstract class ExplorationStrategy
	{
		// For holding the exploration result. The key-value pair 
		// can contain information: FolderName-Size or FileType-Size
		protected Hashtable ExplorationResult;

		// Event raised when an exploration has finished
		public event ExplorationFinishEventHandler Finish;

		// Event raised during the exploration
		public event ExplorationProgressEventHandler Progess;

		public ExplorationStrategy()
		{
			ExplorationResult = new Hashtable();
		}

		// For executing the exploration process. When an exploration finishes
		// the method calls OnFinish()
		public virtual void Explore (string path){}

		// Method for raising Finish event
		protected void OnFinish (object sender)
		{
			if (Finish != null)
			{
				ExplorationFinishEventArgs args = new ExplorationFinishEventArgs();
				args.ExplorationResult = ExplorationResult;
				Finish (sender, args);
			}
		}

		// Method for raising Progress event
		protected void OnProgress (object sender, string path)
		{
			if (Progess != null)
			{
				ExplorationProgressEventArgs args = new ExplorationProgressEventArgs();
				args.Path = path;
				Progess (sender, args);
			}
		}
	}


	/* This class retrieves folders size under a given path then fill
	 * ExplorationResult hastable containing folder names 
	 * and the size of the folders.
	 */
	public class FolderStrategy : ExplorationStrategy
	{
		private Hashtable folderSizeCache;

		public FolderStrategy() 
		{ 
			folderSizeCache = new Hashtable(); 
		}

		/* The method to explore all files and folder under a given path while 
		 * summing the file size and group the result based on the folder name
		 */
		public override void Explore (string pPath)
		{
			long dirSize = 0;

			ExplorationResult.Clear();
			try 
			{
				// Loop to explore all the directories under pPath
				foreach (string dirName in Directory.GetDirectories(pPath))
				{
					// If the size information is already on the cache just 
					// retrieve it from the cache, do not access the file system
					if (folderSizeCache.ContainsKey(dirName)) 
					{
						dirSize = (long) folderSizeCache[dirName];
					} 
					else
					{
						try
						{
							// Access the file system to get the directory size
							DirectoryInfo dirInfo = new DirectoryInfo (dirName);
							dirSize = GetDirectorySize (dirInfo);

							// Add the size to the cache so the subsequent call
							// doesn't need file access anymore
							folderSizeCache.Add (dirName, dirSize);
						}

						// Catch any exception if a folder cannot be accessed
						// e.g. due to security restriction
						catch (Exception) {}
					}

					// Add the result to the hashtable. This is the information
					// that is going to be displayed
					ExplorationResult.Add (Path.GetFileName (dirName), dirSize);
				}

				const string CURRENT_FOLDER_KEY = "(Current Directory)";

				// Get the current directory size if it is already in cache 
				if (folderSizeCache.ContainsKey(CURRENT_FOLDER_KEY)) 
					dirSize = (long) folderSizeCache[CURRENT_FOLDER_KEY];
				else
				{
					// Sum the file size under the current directory
					dirSize = 0;
					foreach (string fileName in Directory.GetFiles(pPath))
					{
						try
						{
							FileInfo fileInfo = new FileInfo(fileName);
							dirSize += fileInfo.Length;
						}

							// Catch any exception if a file cannot be accessed
							// e.g. due to security restriction
						catch (Exception) {}
					}

					// Add the result again to the hashtable
					ExplorationResult.Add (CURRENT_FOLDER_KEY, dirSize);
				}
			}

			// Catch any exception if a folder cannot be accessed
			// e.g. due to security restriction
			catch (Exception) {}

			// Notify all the subscribers that the exploration has finished
			OnFinish (this);
		}

		// A recursive method to calculate directory size 
		private long GetDirectorySize(DirectoryInfo pDirInfo) 
		{    
			long dirSize = 0;    
			
			// Sum file size in the current folder
			FileInfo[] fileInfos = pDirInfo.GetFiles();
			foreach (FileInfo fileInfo in fileInfos) 
			{
				try 
				{
					dirSize += fileInfo.Length;
				}
				
				// Catch any exception if a file cannot be accessed
				// e.g. due to security restriction
				catch (Exception) {}
			}

			// Sum subdirectory size
			DirectoryInfo[] dirInfos = pDirInfo.GetDirectories();
			foreach (DirectoryInfo dirInfo in dirInfos) 
			{
				try 
				{
					OnProgress (this, dirInfo.FullName);
					dirSize += GetDirectorySize(dirInfo); 
				}
				// Catch any exception if a folder cannot be accessed
				// e.g. due to security restriction
				catch (Exception) {}
			}
			return dirSize;  
		}
	}


	/* This class retrieves total file size under a given path then fill
	 * ExplorationResult hastable containing file type and the total size 
	 * of each file type.
	 */
	public class FileTypeStrategy : ExplorationStrategy
	{
		private Hashtable typeSizeCache;

		public FileTypeStrategy() 
		{ 
			typeSizeCache = new Hashtable(); 
		}

		// The method to start the explorration
		public override void Explore (string pPath)
		{
			ExplorationResult.Clear();

			if (!typeSizeCache.Contains(pPath))
			{
				// If the current folder information is not cached then
				// do the exploration
				GetFileTypeSize (new DirectoryInfo (pPath));
				typeSizeCache.Add (pPath, (Hashtable) ExplorationResult.Clone());
			}
			else
				// Otherwise just retrieve the result from the cache
				ExplorationResult = (Hashtable) 
									((Hashtable) typeSizeCache[pPath]).Clone();

			// Notify all the subscribers that the exploration has finished
			OnFinish (this);
		}

		// Explore the file and sum the size of files that have a same extension,
		// i.e. sum .doc with .doc, .exe with .exe, and so on
		private void GetFileTypeSize (DirectoryInfo d)
		{   
			try 
			{
				FileInfo[] fileInfos = d.GetFiles();
				foreach (FileInfo fileInfo in fileInfos) 
				{
					try 
					{
						string fileExt = "*" + fileInfo.Extension.ToLower();

						// Add the file size with the same extension
						if (!ExplorationResult.ContainsKey(fileExt))
						{
							ExplorationResult.Add (fileExt, (long) 0);
						}
						else
						{
							ExplorationResult[fileExt] = (long) ExplorationResult[fileExt] 
								+ fileInfo.Length;
						}
					}
					// Catch any exception if a file cannot be accessed
					// e.g. due to security restriction
					catch (Exception) {}
				}

				// Do the same process to the subdirectories
				DirectoryInfo[] dirInfos = d.GetDirectories();
				foreach (DirectoryInfo dirInfo in dirInfos) 
				{
					OnProgress (this, dirInfo.FullName);
					GetFileTypeSize(dirInfo); 
				}
			}
			// Catch any exception if a folder/file cannot be accessed
			// e.g. due to security restriction
			catch (Exception) {}
		}
	}
}
