using System;
using System.Collections;

namespace StorageExplorer
{

	/* A collection used by the chart, .NET does not have like this one.
	 * The specs:
	 * - Contains key-value pair (.NET Hashtable cannot be sorted)
	 * - The values can be sorted (.NET SortedList only sorts the key)
	 */ 
	public class StringInt64PairedArray
	{
		public string[] Keys { get {return _keys;} }
		public long[] Values { get {return _values;} }
		public long TotalValue { get {return _totalValue;} }
		public int Length {get {return Keys.Length;} }
		public bool IsGrouped {get {return _isGrouped;} }

		private long _totalValue = 0;
		private string[] _keys;
		private long[] _values;
		private bool _isSortedDesc;
		private bool _isGrouped;
 
		public StringInt64PairedArray (IDictionary pData)
		{
			_keys = new string [pData.Count];
			_values = new long[pData.Count];
			pData.Keys.CopyTo (_keys, 0);
			pData.Values.CopyTo (_values, 0);
			for (int i=0; i<_values.Length; i++) 
				_totalValue += _values[i];
			_isSortedDesc = false;
			_isGrouped = false;
		}

		public void SortValuesDesc()
		{
			Array.Sort (_values, _keys, new DescendingComparer());
			_isSortedDesc = true;
		}

		public void GroupValues(int pCountMinimum, int pPercentMinimum)
		{
			if (!_isSortedDesc)
				SortValuesDesc();

			bool boolStop = false;
			long sum = 0;
			int i = 0;
			while (i < _keys.Length && !boolStop)
			{
				if (i<pCountMinimum)
				{
					sum += _values[i];
				}
				else
				{
					sum += _values[i];
					float percent = _values[i] * 100 / (float) _totalValue;
					if (percent < pPercentMinimum)
					{
						long[] arTemp1 = new long[i+1];
						string[] arTemp2 = new string[i+1];

						Array.Copy (_values, arTemp1, i+1);
						Array.Copy (_keys, arTemp2, i+1);
						_values = arTemp1;
						_keys = arTemp2;
						_values[i] = _totalValue - sum;
						_keys[i] = "Others";
						boolStop = true;
						_isGrouped = true;
					}
				}
				i++;
			}
		}
	}

	class DescendingComparer : IComparer
	{
		public int Compare (Object x, Object y)
		{
			return Decimal.Compare ((long) y, (long) x);
		}
	}
}