using System;
using System.IO;
using System.Management;
using System.Collections;
using System.ComponentModel;
using System.Windows.Forms;
using System.Data;

namespace StorageExplorer
{
	/// <summary>
	/// This is a form that provides information to users about the 
	/// compisition of the files inside their hardisk. User query
	/// the information for a specic path by selecting a node from a TreeView.
	/// </summary>
	/// 
	public class StorageExplorerForm : System.Windows.Forms.Form
	{
		private System.Windows.Forms.ImageList imageList1;
		private System.Windows.Forms.ProgressBar progressBar1;
		private System.Windows.Forms.TreeView treeView;
		private System.ComponentModel.IContainer components;
		private System.Windows.Forms.ToolBar toolBar1;
		private System.Windows.Forms.Splitter splitter1;
		private System.Windows.Forms.Label label1;
		private System.Windows.Forms.Label label2;
		private System.Windows.Forms.Panel rightPanel;
		private System.Windows.Forms.ComboBox comboAction;
		private System.Windows.Forms.ComboBox comboObserver;
		private System.Windows.Forms.MainMenu mainMenu1;
		private System.Windows.Forms.MenuItem menuItem1;
		private System.Windows.Forms.MenuItem menuExit;

		private ExplorationStrategy explorer;
		private ExplorationStrategy folderStrategy;
		private ExplorationStrategy fileTypeStrategy;

		private ExplorationObserver folderList;
		private ExplorationObserver fileTypeList;
		private ExplorationObserver pieChart;
		private System.Windows.Forms.ToolBar toolBar2;
		private System.Windows.Forms.Label labelStatus;
		private ExplorationObserver barChart;


		/// <summary>
		/// Clean up any resources being used.
		/// </summary>
		protected override void Dispose( bool disposing )
		{
			if( disposing )
			{
				if (components != null)
				{
					components.Dispose();
				}
			}
			base.Dispose( disposing );
		}

		#region Windows Form Designer generated code
		/// <summary>
		/// Required method for Designer support - do not modify
		/// the contents of this method with the code editor.
		/// </summary>
		private void InitializeComponent()
		{
            this.components = new System.ComponentModel.Container();
            System.ComponentModel.ComponentResourceManager resources = new System.ComponentModel.ComponentResourceManager(typeof(StorageExplorerForm));
            this.progressBar1 = new System.Windows.Forms.ProgressBar();
            this.imageList1 = new System.Windows.Forms.ImageList(this.components);
            this.toolBar1 = new System.Windows.Forms.ToolBar();
            this.treeView = new System.Windows.Forms.TreeView();
            this.splitter1 = new System.Windows.Forms.Splitter();
            this.label1 = new System.Windows.Forms.Label();
            this.comboAction = new System.Windows.Forms.ComboBox();
            this.rightPanel = new System.Windows.Forms.Panel();
            this.label2 = new System.Windows.Forms.Label();
            this.comboObserver = new System.Windows.Forms.ComboBox();
            this.mainMenu1 = new System.Windows.Forms.MainMenu(this.components);
            this.menuItem1 = new System.Windows.Forms.MenuItem();
            this.menuExit = new System.Windows.Forms.MenuItem();
            this.toolBar2 = new System.Windows.Forms.ToolBar();
            this.labelStatus = new System.Windows.Forms.Label();
            this.SuspendLayout();
            // 
            // progressBar1
            // 
            this.progressBar1.Dock = System.Windows.Forms.DockStyle.Bottom;
            this.progressBar1.Location = new System.Drawing.Point(0, 399);
            this.progressBar1.Name = "progressBar1";
            this.progressBar1.Size = new System.Drawing.Size(632, 26);
            this.progressBar1.TabIndex = 3;
            // 
            // imageList1
            // 
            this.imageList1.ImageStream = ((System.Windows.Forms.ImageListStreamer)(resources.GetObject("imageList1.ImageStream")));
            this.imageList1.TransparentColor = System.Drawing.Color.Transparent;
            this.imageList1.Images.SetKeyName(0, "");
            this.imageList1.Images.SetKeyName(1, "");
            this.imageList1.Images.SetKeyName(2, "");
            this.imageList1.Images.SetKeyName(3, "");
            this.imageList1.Images.SetKeyName(4, "");
            this.imageList1.Images.SetKeyName(5, "");
            this.imageList1.Images.SetKeyName(6, "");
            // 
            // toolBar1
            // 
            this.toolBar1.Appearance = System.Windows.Forms.ToolBarAppearance.Flat;
            this.toolBar1.AutoSize = false;
            this.toolBar1.DropDownArrows = true;
            this.toolBar1.Location = new System.Drawing.Point(0, 0);
            this.toolBar1.Name = "toolBar1";
            this.toolBar1.ShowToolTips = true;
            this.toolBar1.Size = new System.Drawing.Size(632, 37);
            this.toolBar1.TabIndex = 0;
            // 
            // treeView
            // 
            this.treeView.Dock = System.Windows.Forms.DockStyle.Left;
            this.treeView.ImageIndex = 0;
            this.treeView.ImageList = this.imageList1;
            this.treeView.Location = new System.Drawing.Point(0, 65);
            this.treeView.Name = "treeView";
            this.treeView.SelectedImageIndex = 0;
            this.treeView.Size = new System.Drawing.Size(269, 334);
            this.treeView.TabIndex = 1;
            // 
            // splitter1
            // 
            this.splitter1.Location = new System.Drawing.Point(269, 65);
            this.splitter1.Name = "splitter1";
            this.splitter1.Size = new System.Drawing.Size(3, 334);
            this.splitter1.TabIndex = 4;
            this.splitter1.TabStop = false;
            // 
            // label1
            // 
            this.label1.Location = new System.Drawing.Point(209, 7);
            this.label1.Name = "label1";
            this.label1.Size = new System.Drawing.Size(48, 26);
            this.label1.TabIndex = 6;
            this.label1.Text = "Action:";
            this.label1.TextAlign = System.Drawing.ContentAlignment.MiddleRight;
            // 
            // comboAction
            // 
            this.comboAction.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList;
            this.comboAction.Items.AddRange(new object[] {
            "Group file size by Folders",
            "Group file size by Type"});
            this.comboAction.Location = new System.Drawing.Point(257, 8);
            this.comboAction.Name = "comboAction";
            this.comboAction.Size = new System.Drawing.Size(180, 24);
            this.comboAction.TabIndex = 7;
            // 
            // rightPanel
            // 
            this.rightPanel.BorderStyle = System.Windows.Forms.BorderStyle.Fixed3D;
            this.rightPanel.Dock = System.Windows.Forms.DockStyle.Fill;
            this.rightPanel.Location = new System.Drawing.Point(272, 65);
            this.rightPanel.Name = "rightPanel";
            this.rightPanel.Size = new System.Drawing.Size(360, 334);
            this.rightPanel.TabIndex = 8;
            // 
            // label2
            // 
            this.label2.Location = new System.Drawing.Point(439, 7);
            this.label2.Name = "label2";
            this.label2.Size = new System.Drawing.Size(96, 26);
            this.label2.TabIndex = 9;
            this.label2.Text = "Display in:";
            this.label2.TextAlign = System.Drawing.ContentAlignment.MiddleRight;
            // 
            // comboObserver
            // 
            this.comboObserver.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList;
            this.comboObserver.Items.AddRange(new object[] {
            "List View",
            "Pie Chart",
            "Bar Chart"});
            this.comboObserver.Location = new System.Drawing.Point(535, 8);
            this.comboObserver.Name = "comboObserver";
            this.comboObserver.Size = new System.Drawing.Size(145, 24);
            this.comboObserver.TabIndex = 10;
            // 
            // mainMenu1
            // 
            this.mainMenu1.MenuItems.AddRange(new System.Windows.Forms.MenuItem[] {
            this.menuItem1});
            // 
            // menuItem1
            // 
            this.menuItem1.Index = 0;
            this.menuItem1.MenuItems.AddRange(new System.Windows.Forms.MenuItem[] {
            this.menuExit});
            this.menuItem1.Text = "File";
            // 
            // menuExit
            // 
            this.menuExit.Index = 0;
            this.menuExit.Text = "Exit";
            this.menuExit.Click += new System.EventHandler(this.menuExit_Click);
            // 
            // toolBar2
            // 
            this.toolBar2.AutoSize = false;
            this.toolBar2.DropDownArrows = true;
            this.toolBar2.Location = new System.Drawing.Point(0, 37);
            this.toolBar2.Name = "toolBar2";
            this.toolBar2.ShowToolTips = true;
            this.toolBar2.Size = new System.Drawing.Size(632, 28);
            this.toolBar2.TabIndex = 12;
            // 
            // labelStatus
            // 
            this.labelStatus.Font = new System.Drawing.Font("Microsoft Sans Serif", 9F, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, ((byte)(0)));
            this.labelStatus.Location = new System.Drawing.Point(19, 42);
            this.labelStatus.Name = "labelStatus";
            this.labelStatus.Size = new System.Drawing.Size(1140, 18);
            this.labelStatus.TabIndex = 13;
            // 
            // StorageExplorerForm
            // 
            this.AutoScaleBaseSize = new System.Drawing.Size(6, 15);
            this.ClientSize = new System.Drawing.Size(632, 425);
            this.Controls.Add(this.labelStatus);
            this.Controls.Add(this.comboObserver);
            this.Controls.Add(this.label2);
            this.Controls.Add(this.rightPanel);
            this.Controls.Add(this.comboAction);
            this.Controls.Add(this.label1);
            this.Controls.Add(this.splitter1);
            this.Controls.Add(this.treeView);
            this.Controls.Add(this.toolBar2);
            this.Controls.Add(this.toolBar1);
            this.Controls.Add(this.progressBar1);
            this.Menu = this.mainMenu1;
            this.Name = "StorageExplorerForm";
            this.Text = "Storage Explorer";
            this.ResumeLayout(false);

		}
		#endregion

		/// <summary>
		/// The main entry point for the application.
		/// </summary>
		
		public StorageExplorerForm()
		{
			//
			// Required for Windows Form Designer support
			//
			InitializeComponent();

			//
			// Add any constructor code after InitializeComponent call
			//
			
			// Initialize the tree view with a list of logical drives
			InitTreeView();

			// Create the strategy objects and assign the Form the initial strategy
			folderStrategy = new FolderStrategy ();
			fileTypeStrategy = new FileTypeStrategy ();
			explorer = folderStrategy;

			// Create the ConcreteObserver that will display the result information
			folderList = new FolderListView ();
			fileTypeList = new FileTypeListView ();
			pieChart = new PieChartAdapter ();
			barChart = new BarChartAdapter ();

			// Subscribe ConcreteObserver objects to ExploringStrategy objects
			// so when the explorer finish its exploration it
			// will notify all the subscribers.
			folderList.SubscribeToExplorationEvent (folderStrategy);
			fileTypeList.SubscribeToExplorationEvent (fileTypeStrategy);
			pieChart.SubscribeToExplorationEvent (folderStrategy);
			pieChart.SubscribeToExplorationEvent (fileTypeStrategy);
			barChart.SubscribeToExplorationEvent (folderStrategy);
			barChart.SubscribeToExplorationEvent (fileTypeStrategy);

			// Select the first option in dropdown
			comboAction.SelectedIndex = 0;
			comboObserver.SelectedIndex = 1;
			pieChart.AddToContainer (rightPanel);

			/* The following event subscription is moved from the inside 
			 * InitializeComponent() method so that comboAction.SelectedIndex and 
			 * comboObserver.SelectedIndex can be initialized after 
			 * InitializeComponent() without raising event.
			 */
			this.comboObserver.SelectedIndexChanged += new System.EventHandler(this.comboObserver_SelectedIndexChanged);
			this.comboAction.SelectedIndexChanged += new System.EventHandler(this.comboAction_SelectedIndexChanged);
			this.treeView.AfterSelect += new System.Windows.Forms.TreeViewEventHandler(this.treeView_AfterSelect);
			this.treeView.BeforeExpand += new System.Windows.Forms.TreeViewCancelEventHandler(this.treeView_BeforeExpand);

			// Event subscribtion to show exploration progress
			folderStrategy.Progess += new ExplorationProgressEventHandler (DisplayProgress);
			fileTypeStrategy.Progess += new ExplorationProgressEventHandler (DisplayProgress);
		}

		// Initialize tree view with a list of logical drives
		private void InitTreeView()
		{
			// Constant for identifying type of logical disk type
			const int REMOVABLE = 2; 
			const int LOCAL_DISK = 3; 
			const int CD = 5; 

			// Add "My Computer" node as the root node
			TreeNode rootNode = treeView.Nodes.Add("My Computer");
			rootNode.ImageIndex = 0;
			rootNode.SelectedImageIndex = 0;
			rootNode.Tag = "root";			// root tag as the mark to exlude this
											// node from node exploration

			// Query all installed disk in the computer
			ManagementObjectSearcher searcher = new ManagementObjectSearcher
										("select * from Win32_LogicalDisk");

			// Add disk-nodes under "My Computer" node
			foreach (ManagementObject share in searcher.Get())
			{
				string driveName = share["Name"].ToString();
				TreeNode node = rootNode.Nodes.Add("" + share["Name"]);
				if (driveName.IndexOf("A") == -1)
				{
					populateNode (node);
				}

				// Select the icon which represent the type of the drive
				switch (Int32.Parse( share["DriveType"].ToString()))
				{
					case REMOVABLE: 
						node.ImageIndex = 5;
						node.SelectedImageIndex = 5;
						break;
					case LOCAL_DISK: 
						node.ImageIndex = 1;
						node.SelectedImageIndex = 1;
						break;
					case CD:
						node.ImageIndex = 2;
						node.SelectedImageIndex = 2;
						break;
				}
			}

			// Expand "My Computer" node
			rootNode.Expand();
			treeView.SelectedNode = null;
		}

		/* This method is used to populate a node with its chidren nodes.
		 * The nodes are populated at two level, starting from the pStartNode down
		 * to children nodes and grandchidren nodes.  
		 */
		private void populateNode(TreeNode pStartNode) 
		{
			string[] dirNames, dirNames2;
			TreeNode node, node2;

			treeView.BeginUpdate();
			pStartNode.Nodes.Clear();
			try 
			{
				// Get the array of directory names under pStartNode
				dirNames = Directory.GetDirectories(GetAbsolutePath(pStartNode));
				Array.Sort(dirNames);

				// Populate all nodes under pStartNode
				foreach (string dirName in dirNames) 
				{
					try
					{
						// Add a node representing a folder
						node = pStartNode.Nodes.Add(Path.GetFileName(dirName));
						node.ImageIndex = 3;
						node.SelectedImageIndex = 4;

						// Get the array of directory names at 2 level under pStartNode
						dirNames2 = Directory.GetDirectories(dirName);
						Array.Sort(dirNames2);

						// Populate all nodes two level under pStartNode
						foreach (string dirName2 in dirNames2)
						{
							// Add a node representing a folder
							node2 = node.Nodes.Add(Path.GetFileName(dirName2));
							node2.ImageIndex = 3;
							node2.SelectedImageIndex = 4;
						}
					}
					
					// catch any exception if a folder cannot be accessed
					// e.g. due to security restriction
					catch (Exception){}
				}
			}

			// catch any exception if a folder cannot be accessed
			// e.g. due to security restriction
			catch (Exception) {}

			treeView.EndUpdate();
		}


		// The method to obtain the fullpath string of a selected node 
		// representing a folder in the treeView
		private string GetAbsolutePath(TreeNode node)
		{
			string s = "";
			if (node.Parent != null && (string) node.Parent.Tag != "root")
				s = GetAbsolutePath(node.Parent);
			return s + node.Text + "\\";
		}


		// The event handler called after selecting a treeView node.
		private void treeView_AfterSelect(object sender, TreeViewEventArgs e)
		{
			// Explore the selected node using the strategy applied to the explorer
			explorer.Explore (GetAbsolutePath(e.Node));

			// Display status
			labelStatus.Text = "Result of path " + GetAbsolutePath (treeView.SelectedNode);
		}

		// The event handler called when you expanding a node in the treeView.
		// So, expand the node and populate the children and grandchildren node
		private void treeView_BeforeExpand(object sender, TreeViewCancelEventArgs e)
		{
			if ((string) e.Node.Tag != "root")
				populateNode(e.Node);
		}

		// The event handler called when you choose the options between: 
		// to see folder size information or file type size information
		private void comboAction_SelectedIndexChanged (object sender, EventArgs e)
		{
			if (treeView.SelectedNode != null)
			{
				switch (comboAction.SelectedIndex)
				{
					case 0: explorer = folderStrategy; break;
					case 1: explorer = fileTypeStrategy; break;
				}
				
				// Do exploration using selected exploration strategy
				explorer.Explore( GetAbsolutePath (treeView.SelectedNode));

				// Make sure that the display is visible
				comboObserver_SelectedIndexChanged (null, null);

				// Display status
				labelStatus.Text = "Result of path " + GetAbsolutePath (treeView.SelectedNode);
			}
		}

		/* The event handler called when you choose the options between:
		 * to see information in ListView or in Charts.
		 * The action is to hide or to show the controls. The reason the control
		 * is shown or hidden instead of being created or destroyed is to make 
		 * the display faster and to maintain the state of the control, 
		 * like the sorting states in the ListView.
		 */
		private void comboObserver_SelectedIndexChanged(object sender, System.EventArgs e)
		{
			rightPanel.Controls.Clear();
			switch (comboObserver.SelectedIndex)
			{
				case 0:
					rightPanel.BorderStyle = BorderStyle.None; 
					switch (comboAction.SelectedIndex)
					{
						case 0: folderList.AddToContainer(rightPanel); break;
						case 1: fileTypeList.AddToContainer(rightPanel); break;
					}
					break;
				case 1: 
					rightPanel.BorderStyle = BorderStyle.Fixed3D;
					pieChart.AddToContainer(rightPanel); 
					break;
				case 2: 
					rightPanel.BorderStyle = BorderStyle.Fixed3D;
					barChart.AddToContainer(rightPanel); 
					break;
			}
		}

		private void menuExit_Click(object sender, System.EventArgs e)
		{
			Application.Exit();
		}

		private void DisplayProgress (object sender, ExplorationProgressEventArgs e)
		{
			labelStatus.Text = "Exploring " + e.Path;
			Application.DoEvents();
		}

		/// <summary>
		/// The main entry point for the application.
		/// </summary>
		[STAThread]

		static void Main() 
		{
			Application.Run(new StorageExplorerForm());
		}
	}
}
