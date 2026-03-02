using System;
using System.Windows.Forms;
using System.Collections;
using System.Drawing;

namespace StorageExplorer
{

	public abstract class ExplorationObserver
	{

		public ExplorationObserver() {}

		// Method to subscribe the class instance to the Finish event
		// so that the object can be notified when the event is raised
		public void SubscribeToExplorationEvent (ExplorationStrategy obj)
		{
			obj.Finish += new ExplorationFinishEventHandler (UpdateDisplay);
		}

		// Method to output the hashtable data to a display.
		// The format of the output is specified by the subclass.
		public abstract void UpdateDisplay (object sender, 
											ExplorationFinishEventArgs e);

		// Method to add the display to the container
		public virtual void AddToContainer (Control container) {} 
	}

	public class ListViewAdapter : ExplorationObserver
	{
		// Control to display the exploration result as a list.
		protected ListView listView;

		public ListViewAdapter()
		{
			// Create a ListView object and initialze it
			listView = new ListView();
			listView.Dock = DockStyle.Fill;
			listView.View = View.Details;
			listView.Columns.Clear();
			listView.Columns.Add ("Name", 150, HorizontalAlignment.Left);
			listView.Columns.Add ("Size", 100, HorizontalAlignment.Right);
			listView.Columns.Add ("Percentage", 70, HorizontalAlignment.Right);
			listView.ColumnClick += new ColumnClickEventHandler
											(ListViewColumn_Click);
		}

		/* This is the template method as specified in Template Method
		 * design patterns. It is used to render the exploration result 
		 * in the ListView. The primitive methods that varies the template
		 * method are the SelectImageList() and the SetLineIcon().
		 */ 
		public override void UpdateDisplay (object sender, 
											ExplorationFinishEventArgs e)
		{
			listView.BeginUpdate();
			listView.Items.Clear();

			// Get the enumerator to iterate the collection
			IDictionaryEnumerator listEnumerator = 
							e.ExplorationResult.GetEnumerator();

			// Sum all the files size. The total will be used 
			// to calculate the files size in percent
			long totalSize = 0;
			while (listEnumerator.MoveNext())
				totalSize += (long) listEnumerator.Value;

			// Loop to fill ListView with ListViewItem
			ListViewItem listItem;
			listEnumerator.Reset();

			while (listEnumerator.MoveNext())
			{
				string itemName = listEnumerator.Key.ToString();
				listItem = new ListViewItem (itemName);

				// Set item icon. This operation needs to be overriden
				SetIcon (listItem);

				// The file size in kilobytes
				string sizeInfo = ((long) listEnumerator.Value/1024).ToString 
													("#,##0") + " KB";
				listItem.SubItems.Add (sizeInfo);

				// Calculate & display the size in percentage
				float percent = (totalSize>0)? 
					(long) listEnumerator.Value * 100 / (float) totalSize : 0;
				listItem.SubItems.Add (percent.ToString("#,##0.00") + " %");

				// Add the ListViewItem to the listView
				listView.Items.Add(listItem);
			}

			listView.EndUpdate();
		}

		protected virtual void SetIcon (ListViewItem item) {}

		// Event handler to start sorting the information in the listView
		private void ListViewColumn_Click(object o, ColumnClickEventArgs e)
		{
			listView.Sorting = (listView.Sorting == SortOrder.Descending) ?
									SortOrder.Ascending : SortOrder.Descending;

			// Sort the clicked column using ListViewItemComparer implementation.
			listView.ListViewItemSorter = new ListViewItemComparer(e.Column);
			listView.Sort();
		}

		// Add the listView to the container
		public override void AddToContainer(Control container) 
		{
			container.Controls.Add (listView);
		}
	}
	
	// The class for showing folder size information in the ListView
	public class FolderListView : ListViewAdapter
	{
		public FolderListView()
		{
			ImageList imageList = new ImageList();
			imageList.Images.Add (IconReader.Instance.GetClosedFolderIcon());
			listView.SmallImageList = imageList;
		}

		protected override void SetIcon (ListViewItem item)
		{
			item.ImageIndex = 0;
		}
	}

	// The class for showing file-type size information in the ListView
	public class FileTypeListView : ListViewAdapter
	{
		public FileTypeListView ()
		{
			listView.SmallImageList = FileIcons.Instance.SmallImageList;
		}

		protected override void SetIcon (ListViewItem item)
		{
			item.ImageIndex = FileIcons.Instance.GetIconIndex (item.Text);
		}
	}

	// The class to be used by ListView sorting process
	sealed class ListViewItemComparer : IComparer 
	{
		private int col;
		
		public ListViewItemComparer() {col=0;}
		public ListViewItemComparer(int column) {col=column;}

		public int Compare(object x, object y) 
		{
			string s;
			long v1, v2;
			int result = 0 ;
			SortOrder sorting = ((ListViewItem)x).ListView.Sorting;

			switch (col)
			{
				// If colum 0 is clicked, do string comparison
				case 0:
					result = (sorting == SortOrder.Ascending )?
						String.Compare
								(((ListViewItem)x).SubItems[col].Text, 
								((ListViewItem)y).SubItems[col].Text) :
						String.Compare
								(((ListViewItem)y).SubItems[col].Text, 
								((ListViewItem)x).SubItems[col].Text);
					break;

				// If colum 1 is clicked, do integer comparison
				// However we need to parse the string before comparing
				case 1:
					s = ((ListViewItem)x).SubItems[col]
						.Text.Trim("KB".ToCharArray());
					s = s.Replace(",", "");
					try {v1 = Int64.Parse(s);} 
					catch (Exception) {v1=0;};

					s = ((ListViewItem)y).SubItems[col].Text.Trim
						("KB".ToCharArray());
					s = s.Replace(",", "");
					try {v2 = Int64.Parse(s);} 
					catch (Exception) {v2=0;};

					result = (sorting == SortOrder.Ascending )? 
						Decimal.Compare(v1, v2) : Decimal.Compare(v2, v1);
					break;

				// If colum 2 is clicked, do string comparison
				// However we need to parse the string before comparing
				case 2:
					s = ((ListViewItem)x).SubItems[col].Text.Trim
							("%".ToCharArray());
					s = s.Replace(".", "");
					try {v1 = Int64.Parse(s);} 
					catch (Exception) {v1=0;};

					s = ((ListViewItem)y).SubItems[col].Text.Trim
							("%".ToCharArray());
					s = s.Replace(".", "");
					try {v2 = Int64.Parse(s);} 
					catch (Exception) {v2=0;};

					result = (sorting == SortOrder.Ascending )? 
						Decimal.Compare(v1, v2) : Decimal.Compare(v2, v1);
					break;
			}
			return result;
		}
	}

	/* This clas provides interface between concrete PieChart class
	 * and the ExplorationObserver class. The assumption is we don't
	 * want to modify the existing PieChart class. 
	 */
	public class PieChartAdapter : ExplorationObserver
	{
		private Chart pieChart;

		public PieChartAdapter ()
		{
			// Create a piechart
			pieChart = new PieChart ();
			pieChart.IsStretch = true;
		}

		// Add the pieChart to the container
		public override void AddToContainer(Control container) 
		{
			container.Controls.Add (pieChart);
		}

		public override void UpdateDisplay (object sender, 
											ExplorationFinishEventArgs e)
		{
			// Draw the chart using the given data
			pieChart.Data = e.ExplorationResult;
			pieChart.Draw();
		}
	}

	public class BarChartAdapter : ExplorationObserver
	{
		private Chart barChart;

		public BarChartAdapter ()
		{
			// Create a piechart
			barChart = new BarChart ();
			barChart.IsStretch = true;
		}

		// Add the pieChart to the container
		public override void AddToContainer(Control container) 
		{
			container.Controls.Add (barChart);
		}

		public override void UpdateDisplay (object sender, 
											ExplorationFinishEventArgs e)
		{
			// Draw the chart using the given data
			barChart.Data = e.ExplorationResult;
			barChart.Draw();
		}
	}



}

