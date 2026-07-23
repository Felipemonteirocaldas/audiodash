from docx import Document
from docx.shared import Inches
from docx.chart.data import ChartData
from docx.enum.chart import XL_CHART_TYPE

doc = Document()
doc.add_heading('Laudo', 0)

chart_data = ChartData()
chart_data.categories = ['125', '250', '500', '1000', '2000', '3000', '4000', '6000', '8000']
chart_data.add_series('VA (OD)', [10, 20, 30, 40, 50, 60, 70, 80, 90])
chart_data.add_series('VO (OD)', [15, 25, 35, 45, 55, 65, 75, 85, 95])

# We'll use a standard Line chart. Scatter charts with straight lines are better but Line charts are easier for XML hacking.
chart = doc.add_chart(
    XL_CHART_TYPE.LINE_MARKERS, x=Inches(1), y=Inches(1),
    cx=Inches(5), cy=Inches(3), chart_data=chart_data
).chart

doc.save('public/template_test.docx')
