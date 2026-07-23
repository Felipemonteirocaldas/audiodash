import xlsxwriter

workbook = xlsxwriter.Workbook('public/template.xlsx')
worksheet = workbook.add_worksheet('Laudo Audiométrico')

# We hide the data table far to the right so it doesn't interfere with our populated layout,
# OR we put it exactly where we plan to populate it.
# Let's put the data table exactly where `exportExcel.ts` puts it!
# In our previous exportExcel.ts, Tonal Table was:
# Row 9: Headers
# Row 10 to 18: Frequencies
# Freq is A, VA(OD) is B, VO(OD) is C, VA(OE) is D, VO(OE) is E

# So X Categories: A10:A18
# VA(OD): B10:B18
# VO(OD): C10:C18
# VA(OE): D10:D18
# VO(OE): E10:E18

freqs = [125, 250, 500, 1000, 2000, 3000, 4000, 6000, 8000]

# Write headers just for template structure
headers = ['Freq. (Hz)', 'VA (OD)', 'VO (OD)', 'VA (OE)', 'VO (OE)']
worksheet.write_row('A9', headers)

for i, f in enumerate(freqs):
    worksheet.write_number(9 + i, 0, f)
    # Write some dummy data so the chart renders something in the template
    # We will overwrite these cells in JS
    worksheet.write_blank(9 + i, 1, None)
    worksheet.write_blank(9 + i, 2, None)
    worksheet.write_blank(9 + i, 3, None)
    worksheet.write_blank(9 + i, 4, None)

# Create a Line Chart
chart = workbook.add_chart({'type': 'line'})

# Configure series
# VA (OD)
chart.add_series({
    'name':       "VA (OD)",
    'categories': "='Laudo Audiométrico'!$A$10:$A$18",
    'values':     "='Laudo Audiométrico'!$B$10:$B$18",
    'line':       {'color': '#EF4444', 'width': 1.5},
    'marker':     {'type': 'circle', 'size': 6, 'border': {'color': '#EF4444'}, 'fill': {'none': True}},
    'connect_empty_spaces': True,
})

# VO (OD)
chart.add_series({
    'name':       "VO (OD)",
    'categories': "='Laudo Audiométrico'!$A$10:$A$18",
    'values':     "='Laudo Audiométrico'!$C$10:$C$18",
    'line':       {'color': '#EF4444', 'width': 1.5, 'dash_type': 'dash'},
    'marker':     {'type': 'triangle', 'size': 6, 'border': {'color': '#EF4444'}, 'fill': {'none': True}},
    'connect_empty_spaces': True,
})

# VA (OE)
chart.add_series({
    'name':       "VA (OE)",
    'categories': "='Laudo Audiométrico'!$A$10:$A$18",
    'values':     "='Laudo Audiométrico'!$D$10:$D$18",
    'line':       {'color': '#3B82F6', 'width': 1.5},
    'marker':     {'type': 'x', 'size': 6, 'border': {'color': '#3B82F6'}, 'fill': {'color': '#3B82F6'}},
    'connect_empty_spaces': True,
})

# VO (OE)
chart.add_series({
    'name':       "VO (OE)",
    'categories': "='Laudo Audiométrico'!$A$10:$A$18",
    'values':     "='Laudo Audiométrico'!$E$10:$E$18",
    'line':       {'color': '#3B82F6', 'width': 1.5, 'dash_type': 'dash'},
    'marker':     {'type': 'square', 'size': 6, 'border': {'color': '#3B82F6'}, 'fill': {'none': True}},
    'connect_empty_spaces': True,
})

# Configure Y-axis
chart.set_y_axis({
    'name': 'Intensidade (dB HL)',
    'reverse': True,
    'major_gridlines': {
        'visible': True,
        'line': {'color': '#E2E8F0'}
    }
})

# Configure X-axis
chart.set_x_axis({
    'name': 'Frequência (Hz)',
    'position_axis': 'on_tick',
    'major_gridlines': {
        'visible': True,
        'line': {'color': '#E2E8F0'}
    }
})

chart.set_legend({'none': True})

chart.set_size({'width': 450, 'height': 450})

# Insert chart into worksheet at column F row 8
worksheet.insert_chart('F8', chart)

# Hide gridlines
worksheet.hide_gridlines(2)

workbook.close()
